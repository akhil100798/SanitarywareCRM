import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Loader2, Package, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { brandService, productService } from '../../services/productService';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE_BYTES = 160 * 1024 * 1024;

const BulkUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [selectedSkus, setSelectedSkus] = useState([]);
    const [unavailableSkus, setUnavailableSkus] = useState([]);
    const [activeDiffTab, setActiveDiffTab] = useState('ALL'); // ALL, NEW, INCREASE, DECREASE, UNCHANGED

    // Async job tracking
    const [jobProgress, setJobProgress] = useState(null);
    const [uploadProgressPercent, setUploadProgressPercent] = useState(0);
    const [uploadTimeoutError, setUploadTimeoutError] = useState(false);
    const pollIntervalRef = useRef(null);

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            fetchBrands();
            setResult(null);
            setPreview(null);
            setFile(null);
            setSelectedBrand('');
            setSelectedSkus([]);
            setUnavailableSkus([]);
            setActiveDiffTab('ALL');
            setJobProgress(null);
        } else {
            document.body.style.overflow = 'unset';
            stopPolling();
        }
        return () => {
            document.body.style.overflow = 'unset';
            stopPolling();
        };
    }, [isOpen]);

    const fetchBrands = async () => {
        try {
            const response = await brandService.getAll();
            setBrands(response.data);
        } catch (error) {
            toast.error('Failed to load brands');
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf'))) {
            if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
                toast.error('PDF file exceeds the 160 MB upload limit');
                setFile(null);
                setPreview(null);
                e.target.value = '';
                return;
            }
            setFile(selectedFile);
            setPreview(null);
            setSelectedSkus([]);
            setUnavailableSkus([]);
        } else {
            toast.error('Please select a valid PDF file');
            setFile(null);
            e.target.value = '';
            setPreview(null);
            setSelectedSkus([]);
            setUnavailableSkus([]);
        }
    };

    const handlePreview = async (e) => {
        e.preventDefault();
        if (!selectedBrand || !file) {
            toast.error('Please select a brand and a file');
            return;
        }

        stopPolling();
        setPreviewing(true);
        setUploadTimeoutError(false);
        setUploadProgressPercent(0);
        setJobProgress({
            status: 'PROCESSING',
            progressPercent: 5,
            stageMessage: 'Upload: 5% (Transferring vendor catalog PDF...)',
            currentPage: 0,
            totalPages: 0,
            productsFound: 0,
            imagesCropped: 0
        });

        try {
            const response = await productService.previewCatalogUploadAsync(selectedBrand, file, (progressEvent) => {
                if (progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgressPercent(percent);
                    setJobProgress(prev => ({
                        ...(prev || {}),
                        status: 'PROCESSING',
                        progressPercent: Math.min(percent, 95),
                        stageMessage: `Upload: ${percent}% (Transferring vendor catalog PDF...)`
                    }));
                }
            });
            const initialJob = response.data;
            const jobId = initialJob.jobId;
            setJobProgress(initialJob);

            pollIntervalRef.current = setInterval(async () => {
                try {
                    const statusRes = await productService.getCatalogJobProgress(jobId);
                    const job = statusRes.data;
                    setJobProgress(job);

                    if (job.status === 'COMPLETED') {
                        stopPolling();
                        setPreviewing(false);
                        setPreview(job.previewResult);
                        setSelectedSkus(
                            (job.previewResult?.items || [])
                                .filter((item) => item.action !== 'CONFLICT')
                                .map((item) => item.sku)
                        );
                        setUnavailableSkus([]);
                        if (job.previewResult?.importAllowed) {
                            toast.success('Preview ready! Review proposed changes before confirming.');
                        } else {
                            toast.error('Preview found unsupported or conflicting rows. No products were changed.');
                        }
                    } else if (job.status === 'FAILED') {
                        stopPolling();
                        setPreviewing(false);
                        toast.error(job.errorMessage || 'Catalog preview analysis failed.');
                    }
                } catch (pollErr) {
                    console.error('Polling error', pollErr);
                }
            }, 1000);
        } catch (error) {
            stopPolling();
            setPreviewing(false);
            setJobProgress(null);
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout') || error.response?.status === 504;
            if (isTimeout) {
                setUploadTimeoutError(true);
                toast.error('Upload timed out due to slow network connection');
            } else {
                const message = error.response?.status === 413
                    ? 'PDF file exceeds the 160 MB upload limit'
                    : error.response?.data?.message || 'Preview job initialization failed';
                toast.error(message);
            }
        }
    };

    const handleUpload = async () => {
        if (!preview?.sha256 || !selectedBrand || !file || (preview?.conflictCount > 0 && !preview?.importAllowed)) {
            toast.error('Run a valid preview before confirming the import');
            return;
        }

        stopPolling();
        setUploading(true);
        setJobProgress({
            status: 'PROCESSING',
            progressPercent: 5,
            stageMessage: 'Submitting import batch to background engine...',
            currentPage: 0,
            totalPages: preview.pageCount || 0,
            productsFound: selectedSkus.length,
            imagesCropped: 0
        });

        try {
            const response = await productService.bulkCatalogUploadAsync(
                selectedBrand, file, preview.sha256, selectedSkus, unavailableSkus
            );
            const initialJob = response.data;
            const jobId = initialJob.jobId;
            setJobProgress(initialJob);

            pollIntervalRef.current = setInterval(async () => {
                try {
                    const statusRes = await productService.getCatalogJobProgress(jobId);
                    const job = statusRes.data;
                    setJobProgress(job);

                    if (job.status === 'COMPLETED') {
                        stopPolling();
                        setUploading(false);
                        setResult(job.importResult);
                        toast.success('Upload completed successfully!');
                        if (onUploadSuccess) onUploadSuccess();
                    } else if (job.status === 'FAILED') {
                        stopPolling();
                        setUploading(false);
                        toast.error(job.errorMessage || 'Catalog database import failed.');
                    }
                } catch (pollErr) {
                    console.error('Import polling error', pollErr);
                }
            }, 1000);
        } catch (error) {
            stopPolling();
            setUploading(false);
            setJobProgress(null);
            const message = error.response?.status === 413
                ? 'PDF file exceeds the 160 MB upload limit'
                : error.response?.data?.message || 'Upload job initialization failed';
            toast.error(message);
        }
    };

    if (!isOpen) return null;

    // Price revision calculations & tab filtering
    const priceIncreasesCount = preview?.priceIncreasesCount ?? (preview?.items?.filter((i) => i.priceChangeType === 'INCREASE').length || 0);
    const priceDecreasesCount = preview?.priceDecreasesCount ?? (preview?.items?.filter((i) => i.priceChangeType === 'DECREASE').length || 0);
    const priceUnchangedCount = preview?.priceUnchangedCount ?? (preview?.items?.filter((i) => i.priceChangeType === 'UNCHANGED').length || 0);
    const newProductsCount = preview?.items?.filter((i) => i.priceChangeType === 'NEW' || i.action === 'CREATE').length ?? (preview?.createCount || 0);

    const filteredItems = (preview?.items || []).filter((item) => {
        if (activeDiffTab === 'NEW') return item.priceChangeType === 'NEW' || item.action === 'CREATE';
        if (activeDiffTab === 'INCREASE') return item.priceChangeType === 'INCREASE';
        if (activeDiffTab === 'DECREASE') return item.priceChangeType === 'DECREASE';
        if (activeDiffTab === 'UNCHANGED') return item.priceChangeType === 'UNCHANGED';
        return true;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className={`bg-white rounded-2xl shadow-2xl w-full ${preview ? 'max-w-6xl' : 'max-w-xl'} max-h-[90vh] flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in zoom-in`}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                            <div className="flex items-center space-x-2">
                                <FileText className="text-blue-600" size={24} />
                                <h2 className="text-xl font-bold text-gray-900">Bulk Import Catalog (PDF)</h2>
                            </div>
                            <button onClick={onClose} disabled={previewing || uploading} className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-40">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                {/* Live Progress Bar Container for Async Operations */}
                                {(previewing || uploading) && jobProgress && (
                                    <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-2xl shadow-xs space-y-4 animate-in fade-in">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2.5">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center animate-spin">
                                                    <Loader2 size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">
                                                        {previewing ? 'Analyzing Catalog Structure & Extracting Products' : 'Importing Products into Database'}
                                                    </div>
                                                    <div className="text-xs text-blue-800 font-medium">{jobProgress.stageMessage || 'Processing...'}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-black text-blue-700">{jobProgress.progressPercent || 0}%</div>
                                                {jobProgress.totalPages > 0 && (
                                                    <div className="text-[11px] text-gray-500 font-medium">
                                                        Page {jobProgress.currentPage || 1} of {jobProgress.totalPages}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress bar track & filler */}
                                        <div className="w-full bg-blue-100/80 rounded-full h-3 overflow-hidden shadow-inner">
                                            <div
                                                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${Math.max(5, Math.min(100, jobProgress.progressPercent || 5))}%` }}
                                            />
                                        </div>

                                        {/* Live Stats Chips */}
                                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                            <div className="bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-blue-100 font-medium text-slate-700 flex items-center space-x-1.5 shadow-2xs">
                                                <Package size={14} className="text-blue-500" />
                                                <span>Products Discovered: <strong>{jobProgress.productsFound || 0}</strong></span>
                                            </div>
                                            <div className="bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-blue-100 font-medium text-slate-700 flex items-center space-x-1.5 shadow-2xs">
                                                <Sparkles size={14} className="text-indigo-500" />
                                                <span>Images Cropped: <strong>{jobProgress.imagesCropped || 0}</strong></span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 ml-auto italic">
                                                Large catalogs run securely in the background without timeout.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!result && !preview ? (
                                    <form onSubmit={handlePreview} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Select Brand
                                            </label>
                                            <select
                                                value={selectedBrand}
                                                onChange={(e) => {
                                                    setSelectedBrand(e.target.value);
                                                    setPreview(null);
                                                    setSelectedSkus([]);
                                                    setUnavailableSkus([]);
                                                    const brand = brands.find((item) => String(item.id) === e.target.value);
                                                    if (brand?.catalogFileName) {
                                                        brandService.downloadCatalog(brand.id).then((response) => {
                                                            const catalog = new File(
                                                                [response.data],
                                                                brand.catalogFileName,
                                                                { type: 'application/pdf' }
                                                            );
                                                            setFile(catalog);
                                                        }).catch((error) => {
                                                            setFile(null);
                                                            toast.error(error.response?.data?.message || 'Could not load brand catalog');
                                                        });
                                                    } else {
                                                        setFile(null);
                                                    }
                                                }}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                required
                                            >
                                                <option value="">Select a brand</option>
                                                {brands.map((brand) => (
                                                    <option key={brand.id} value={brand.id}>
                                                        {brand.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 transition-all cursor-pointer relative">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                disabled={uploading || previewing}
                                            />
                                            <div className="space-y-2">
                                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                                                    <Upload size={24} />
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {file ? (
                                                        <span className="font-medium text-blue-600 underline">{file.name}</span>
                                                    ) : (
                                                        <>
                                                            <span className="font-medium text-blue-600 underline">Click to upload</span> or drag and drop
                                                        </>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400">PDF files only (Max 160 MB)</div>
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 rounded-lg p-4 flex items-start space-x-3">
                                            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                            <div className="text-xs text-amber-800">
                                                <p className="font-bold mb-1">Universal Catalog Ingestion Engine:</p>
                                                <p>Analyzes visual grid, high-res raster, and pipe fitting tabular catalogs. Automatic canvas cropping extracts high-resolution product imagery, detects model variants/sizes, and computes annual price list revisions.</p>
                                            </div>
                                        </div>

                                        {uploadTimeoutError && (
                                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3 animate-in fade-in">
                                                <div className="flex items-center space-x-2.5 text-red-700 text-xs font-semibold">
                                                    <AlertTriangle size={18} className="text-red-500 shrink-0" />
                                                    <span>Slow 3G connection timed out transferring catalog.</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handlePreview}
                                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-sm"
                                                >
                                                    Retry upload
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={previewing || uploading || !file || !selectedBrand}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                                        >
                                            {previewing ? (
                                                <>
                                                    <Loader2 size={20} className="animate-spin" />
                                                    <span>Analyzing catalog in background...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FileText size={20} />
                                                    <span>Preview Catalogue</span>
                                                </>
                                            )}
                                        </button>
                                    </form>
                                ) : preview && !result ? (
                                    <div className="space-y-5">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Review Import Preview</h3>
                                            <p className="text-sm text-gray-600">
                                                {preview.fileName} · Brand: {preview.brandName} · {preview.pageCount} pages
                                            </p>
                                            <p className="mt-2 text-xs text-green-800 bg-green-50 rounded-lg p-3">
                                                This is a no-write preview. No products or categories have been changed.
                                                Confirm only after reviewing the complete proposed row list.
                                                Existing stock and manually uploaded images are preserved.
                                            </p>
                                        </div>

                                        {/* Catalog Overview Metrics */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                                            {[
                                                ['Candidates', preview.candidateCount],
                                                ['With Images', preview.items?.filter((item) => item.hasImage || item.imagePreviewUrl).length || 0],
                                                ['Create', preview.createCount],
                                                ['Update', preview.updateCount],
                                                ['Rejected / conflicts', preview.rejectedCount]
                                            ].map(([label, value]) => (
                                                <div key={label} className="rounded-lg bg-slate-50 p-3">
                                                    <div className="text-xl font-bold text-slate-800">{value}</div>
                                                    <div className="text-xs text-slate-600">{label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Price Revision / Batch Diff Filter Tabs */}
                                        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 pt-1">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Price Revisions:</span>
                                            <button
                                                type="button"
                                                onClick={() => setActiveDiffTab('ALL')}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${activeDiffTab === 'ALL'
                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                            >
                                                <span>All Products</span>
                                                <span className="bg-white/20 px-1.5 py-0.2 rounded text-[10px]">{preview.candidateCount}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveDiffTab('NEW')}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${activeDiffTab === 'NEW'
                                                        ? 'bg-emerald-600 text-white shadow-xs'
                                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                                                    }`}
                                            >
                                                <Sparkles size={12} />
                                                <span>New Products</span>
                                                <span className="bg-emerald-200/50 px-1.5 py-0.2 rounded text-[10px] font-bold">{newProductsCount}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveDiffTab('INCREASE')}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${activeDiffTab === 'INCREASE'
                                                        ? 'bg-amber-600 text-white shadow-xs'
                                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                                                    }`}
                                            >
                                                <TrendingUp size={12} />
                                                <span>Price Increases</span>
                                                <span className="bg-amber-200/50 px-1.5 py-0.2 rounded text-[10px] font-bold">{priceIncreasesCount}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveDiffTab('DECREASE')}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${activeDiffTab === 'DECREASE'
                                                        ? 'bg-cyan-600 text-white shadow-xs'
                                                        : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200/60'
                                                    }`}
                                            >
                                                <TrendingDown size={12} />
                                                <span>Price Cuts</span>
                                                <span className="bg-cyan-200/50 px-1.5 py-0.2 rounded text-[10px] font-bold">{priceDecreasesCount}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveDiffTab('UNCHANGED')}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${activeDiffTab === 'UNCHANGED'
                                                        ? 'bg-slate-700 text-white shadow-xs'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    }`}
                                            >
                                                <Minus size={12} />
                                                <span>Unchanged</span>
                                                <span className="bg-slate-200 px-1.5 py-0.2 rounded text-[10px] font-bold">{priceUnchangedCount}</span>
                                            </button>
                                        </div>

                                        {preview.warnings?.length > 0 && (
                                            <div className={`rounded-lg border p-3 ${preview.conflictCount > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                                                <h4 className="mb-2 flex items-center text-sm font-bold">
                                                    <AlertTriangle size={16} className="mr-1" />
                                                    {preview.conflictCount > 0 ? `Import blocked — ${preview.warnings.length} diagnostic(s)` : `Preview Diagnostics — ${preview.warnings.length} notice(s)`}
                                                </h4>
                                                <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                                                    {preview.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
                                                </div>
                                            </div>
                                        )}

                                        <div className="max-h-96 overflow-auto rounded-xl border border-gray-200">
                                            <p className="border-b bg-slate-50 p-2.5 text-xs text-slate-600 flex items-center justify-between">
                                                <span>Showing {filteredItems.length} of {preview.items?.length || 0} items. Select rows to import.</span>
                                                <span className="font-semibold text-slate-700">{selectedSkus.length} items selected</span>
                                            </p>
                                            <table className="min-w-full text-left text-xs">
                                                <thead className="sticky top-0 bg-slate-100 text-slate-700 shadow-xs">
                                                    <tr>
                                                        <th className="p-2.5">Action</th>
                                                        <th className="p-2.5">Image</th>
                                                        <th className="p-2.5">SKU / Page</th>
                                                        <th className="p-2.5">Product Name</th>
                                                        <th className="p-2.5">Category</th>
                                                        <th className="p-2.5">Size</th>
                                                        <th className="p-2.5">Proposed MRP & Diff</th>
                                                        <th className="p-2.5">Description / Details</th>
                                                        <th className="p-2.5">Existing Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredItems.map((item) => (
                                                        <tr key={`${item.sku}-${item.sourcePage}`} className={`hover:bg-slate-50/70 transition-colors ${unavailableSkus.includes(item.sku) ? 'bg-black text-white' : ''}`}>
                                                            <td className="p-2.5 font-semibold">
                                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedSkus.includes(item.sku)}
                                                                        disabled={item.action === 'CONFLICT'}
                                                                        onChange={(event) => {
                                                                            setSelectedSkus((current) => event.target.checked
                                                                                ? [...current, item.sku]
                                                                                : current.filter((sku) => sku !== item.sku));
                                                                            if (!event.target.checked) {
                                                                                setUnavailableSkus((current) => current.filter((sku) => sku !== item.sku));
                                                                            }
                                                                        }}
                                                                    />
                                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${item.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' :
                                                                            item.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                                                                                'bg-rose-100 text-rose-800'
                                                                        }`}>
                                                                        {item.action}
                                                                    </span>
                                                                </label>
                                                            </td>
                                                            <td className="p-2.5">
                                                                {item.imagePreviewUrl ? (
                                                                    <img
                                                                        src={item.imagePreviewUrl}
                                                                        alt={item.name}
                                                                        className="w-12 h-12 object-contain rounded-lg border border-gray-200 bg-white"
                                                                    />
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex flex-col items-center justify-center text-gray-400 text-[9px] border border-gray-200">
                                                                        <Package size={16} />
                                                                        <span>{item.hasImage ? 'Image' : 'No Image'}</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-2.5 font-mono text-xs">
                                                                <span className="font-bold text-slate-800">{item.sku}</span>
                                                                <span className="block text-[11px] text-slate-400 mt-0.5 font-sans">Page {item.sourcePage}</span>
                                                            </td>
                                                            <td className="p-2.5 max-w-xs">
                                                                <div className={`font-semibold text-slate-900 ${unavailableSkus.includes(item.sku) ? 'line-through text-white' : ''}`}>
                                                                    {item.name || '--'}
                                                                </div>
                                                            </td>
                                                            <td className="p-2.5 whitespace-nowrap">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                                    {item.category && item.category !== 'null' ? item.category : 'General Catalogue'}
                                                                </span>
                                                            </td>
                                                            <td className="p-2.5 whitespace-nowrap">
                                                                {item.size && item.size !== '--' && item.size !== 'null' ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                                                                        {item.size}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-400">--</span>
                                                                )}
                                                            </td>
                                                            <td className="p-2.5 whitespace-nowrap">
                                                                <div className="font-bold text-slate-900 text-xs">₹{Number(item.proposedMrp || 0).toLocaleString()}</div>

                                                                {/* Price Diff Badge */}
                                                                {item.priceChangeType === 'INCREASE' && (
                                                                    <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 mt-1">
                                                                        <TrendingUp size={10} />
                                                                        <span>+{item.priceDiffPercentage}% (+₹{Number(item.priceDifference || 0).toLocaleString()})</span>
                                                                    </div>
                                                                )}
                                                                {item.priceChangeType === 'DECREASE' && (
                                                                    <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 mt-1">
                                                                        <TrendingDown size={10} />
                                                                        <span>{item.priceDiffPercentage}% (₹{Number(item.priceDifference || 0).toLocaleString()})</span>
                                                                    </div>
                                                                )}
                                                                {item.priceChangeType === 'NEW' && (
                                                                    <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 mt-1">
                                                                        NEW
                                                                    </div>
                                                                )}
                                                                {item.priceChangeType === 'UNCHANGED' && (
                                                                    <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 mt-1">
                                                                        Unchanged
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-2.5 max-w-xs">
                                                                <div className="text-xs text-slate-600 line-clamp-2" title={item.description}>
                                                                    {item.description && item.description !== '--' && item.description !== 'null' ? item.description : '--'}
                                                                </div>
                                                                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
                                                                    {item.hsnCode && item.hsnCode !== '--' && item.hsnCode !== 'null' && <span>HSN: {item.hsnCode}</span>}
                                                                    {item.itemCode && item.itemCode !== '--' && item.itemCode !== 'null' && <span>Item: {item.itemCode}</span>}
                                                                    {item.materialCode && item.materialCode !== '--' && item.materialCode !== 'null' && <span>Mat: {item.materialCode}</span>}
                                                                </div>
                                                                <label className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        disabled={!selectedSkus.includes(item.sku)}
                                                                        checked={unavailableSkus.includes(item.sku)}
                                                                        onChange={(event) => setUnavailableSkus((current) => event.target.checked
                                                                            ? [...current, item.sku]
                                                                            : current.filter((sku) => sku !== item.sku))}
                                                                    />
                                                                    Mark unavailable
                                                                </label>
                                                            </td>
                                                            <td className="p-2.5 text-xs">
                                                                {item.action === 'UPDATE' ? (
                                                                    <div>
                                                                        <div className="font-medium text-slate-700">{item.existingName}</div>
                                                                        <div className="text-slate-400 text-[11px]">Existing: ₹{Number(item.existingMrp || 0).toLocaleString()}</div>
                                                                    </div>
                                                                ) : item.action === 'CONFLICT' ? (
                                                                    <div className="text-rose-600 font-medium">
                                                                        {item.existingBrand || 'Other brand'} · {item.existingName}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-emerald-600 font-medium text-[11px]">New Product</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                            <div className="flex flex-col gap-2 sm:flex-row sticky bottom-0 bg-white/95 backdrop-blur-sm pt-4 pb-1 border-t border-gray-100 mt-4 shrink-0 shadow-sm z-10">
                                                <button
                                                    type="button"
                                                    disabled={uploading}
                                                    onClick={() => setPreview(null)}
                                                    className="w-full rounded-xl bg-gray-100 py-3 font-bold text-gray-800 disabled:opacity-50"
                                                >
                                                    Choose Another File
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={uploading || (!preview.importAllowed && preview.conflictCount > 0) || selectedSkus.length === 0}
                                                    onClick={handleUpload}
                                                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-md"
                                                >
                                                    {uploading ? 'Importing products in background...' : `Confirm and Import (${selectedSkus.length} products)`}
                                                </button>
                                            </div>
                                        </div>
                                        ) : (
                                        <div className="space-y-6">
                                            <div className="text-center">
                                                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <CheckCircle size={32} />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900">Import Summary</h3>
                                                <p className="text-gray-500">Processing complete for {file?.name}</p>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div className="bg-blue-50 p-4 rounded-xl text-center">
                                                    <div className="text-2xl font-bold text-blue-600">{result.totalProcessed}</div>
                                                    <div className="text-xs text-blue-600 uppercase font-bold tracking-wider">Total</div>
                                                </div>
                                                <div className="bg-green-50 p-4 rounded-xl text-center">
                                                    <div className="text-2xl font-bold text-green-600">{result.createdCount}</div>
                                                    <div className="text-xs text-green-600 uppercase font-bold tracking-wider">Created</div>
                                                </div>
                                                <div className="bg-indigo-50 p-4 rounded-xl text-center">
                                                    <div className="text-2xl font-bold text-indigo-600">{result.updatedCount}</div>
                                                    <div className="text-xs text-indigo-600 uppercase font-bold tracking-wider">Updated</div>
                                                </div>
                                                <div className="bg-purple-50 p-4 rounded-xl text-center">
                                                    <div className="text-2xl font-bold text-purple-600">{result.imagesLinkedCount || 0}</div>
                                                    <div className="text-xs text-purple-600 uppercase font-bold tracking-wider">Images</div>
                                                </div>
                                            </div>

                                            {result.skippedCount > 0 && (
                                                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                                                    {result.skippedCount} candidate product rows were skipped because their commercial data could not be validated.
                                                </p>
                                            )}

                                            {Number(result.imagesLinkedCount || 0) === 0 && (
                                                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                                                    No product images were linked from this PDF.
                                                </p>
                                            )}

                                            {result.errors && result.errors.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-bold text-red-600 flex items-center">
                                                        <AlertTriangle size={16} className="mr-1" />
                                                        Warnings ({result.errors.length})
                                                    </h4>
                                                    <div className="max-h-40 overflow-y-auto bg-red-50 rounded-lg p-3 text-xs text-red-700 space-y-1 font-mono">
                                                        {result.errors.map((error, idx) => (
                                                            <div key={idx}>• {error}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={onClose}
                                                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-all"
                                            >
                                                Close Summary
                                            </button>
                                        </div>
                    )}
                                    </div>
            </div>
                        </div>
                        );
};

                        export default BulkUploadModal;
