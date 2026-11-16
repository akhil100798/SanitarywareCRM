import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
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

    useEffect(() => {
        if (isOpen) {
            fetchBrands();
            setResult(null);
            setPreview(null);
            setFile(null);
            setSelectedBrand('');
            setSelectedSkus([]);
            setUnavailableSkus([]);
        }
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

        try {
            setPreviewing(true);
            const response = await productService.previewCatalogUpload(selectedBrand, file);
            setPreview(response.data);
            setSelectedSkus(response.data.items
                .filter((item) => item.action !== 'CONFLICT')
                .map((item) => item.sku));
            setUnavailableSkus([]);
            if (response.data.importAllowed) {
                toast.success('Preview ready. Review all proposed changes before confirming.');
            } else {
                toast.error('Preview found unsupported or conflicting rows. No products were changed.');
            }
        } catch (error) {
            const message = error.response?.status === 413
                ? 'PDF file exceeds the 160 MB upload limit'
                : error.response?.data?.message || 'Preview failed';
            toast.error(message);
        } finally {
            setPreviewing(false);
        }
    };

    const handleUpload = async () => {
        if (!preview?.importAllowed || !preview.sha256 || !selectedBrand || !file) {
            toast.error('Run a valid preview before confirming the import');
            return;
        }
        try {
            setUploading(true);
            const response = await productService.bulkCatalogUpload(
                selectedBrand, file, preview.sha256, selectedSkus, unavailableSkus);
            setResult(response.data);
            toast.success('Upload completed!');
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            const message = error.response?.status === 413
                ? 'PDF file exceeds the 160 MB upload limit'
                : error.response?.data?.message || 'Upload failed';
            toast.error(message);
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Bulk Import Catalog (PDF)</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
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
                                                toast.error(error.response?.data?.message || 'Could not load the brand catalog');
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
                                    disabled={uploading}
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
                                    <p className="font-bold mb-1">Important Note:</p>
                                    <p>Products are imported only when the PDF provides a recognizable SKU, name, and currency-marked price. Existing products are updated by SKU; stock and manually uploaded images are preserved. Catalogue pictures are not matched automatically—upload images separately using an exact SKU mapping.</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={previewing || uploading || !file || !selectedBrand}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                            >
                                {previewing ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Preparing no-write preview...</span>
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
                                    Existing stock and manually uploaded images are preserved. Catalog images are not automatically matched to products.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                {[
                                    ['Candidates', preview.candidateCount],
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

                            {preview.warnings?.length > 0 && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                    <h4 className="mb-2 flex items-center text-sm font-bold text-red-700">
                                        <AlertTriangle size={16} className="mr-1" />
                                        Import blocked — {preview.warnings.length} diagnostic(s)
                                    </h4>
                                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-red-700">
                                        {preview.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
                                    </div>
                                </div>
                            )}

                            <div className="max-h-72 overflow-auto rounded-lg border border-gray-200">
                                <p className="border-b bg-slate-50 p-2 text-xs text-slate-600">
                                    Select the products to import. Mark a selected row unavailable only when you have reviewed and confirmed that status.
                                </p>
                                <table className="min-w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-gray-100 text-gray-700">
                                        <tr>
                                            <th className="p-2">Action</th>
                                            <th className="p-2">SKU / Page</th>
                                            <th className="p-2">Product details / proposed MRP</th>
                                            <th className="p-2">Existing value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.items?.map((item) => (
                                            <tr key={`${item.sku}-${item.sourcePage}`} className={`border-t ${unavailableSkus.includes(item.sku) ? 'bg-black text-white' : ''}`}>
                                                <td className="p-2 font-semibold">
                                                    <label className="flex items-center gap-1">
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
                                                        {item.action}
                                                    </label>
                                                </td>
                                                <td className="p-2">{item.sku}<br />Page {item.sourcePage}</td>
                                                <td className="p-2">
                                                    <span className={unavailableSkus.includes(item.sku) ? 'line-through' : ''}>{item.name}</span>
                                                    <br />₹{item.proposedMrp}
                                                    <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                                                        <span>HSN: {item.hsnCode || '—'}</span>
                                                        <span>Material: {item.material || '—'}</span>
                                                        <span>Material code: {item.materialCode || '—'}</span>
                                                        <span>Item code: {item.itemCode || '—'}</span>
                                                        <span>Availability: {item.isAvailable === false ? 'Unavailable' : 'Available'}</span>
                                                    </div>
                                                    <label className="mt-1 flex items-center gap-1 text-[10px]">
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
                                                <td className="p-2">
                                                    {item.action === 'UPDATE'
                                                        ? `${item.existingName} · ₹${item.existingMrp}`
                                                        : item.action === 'CONFLICT'
                                                            ? `${item.existingBrand || 'Other brand'} · ${item.existingName}`
                                                            : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
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
                                    disabled={uploading || !preview.importAllowed || selectedSkus.length === 0}
                                    onClick={handleUpload}
                                    className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {uploading ? 'Importing reviewed PDF...' : 'Confirm and Import'}
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
                                    {result.skippedCount} candidate product rows were skipped because their commercial data could not be validated. The warning list shows affected pages.
                                </p>
                            )}

                            {Number(result.imagesLinkedCount || 0) === 0 && (
                                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                                    No product images were linked. Catalog images need an authoritative SKU-to-image mapping and are not assigned by page position.
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
