import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { brandService, productService } from '../../services/productService';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';

const BulkUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchBrands();
            setResult(null); setUploadError(''); setFile(null); setSelectedBrand('');
        }
    }, [isOpen]);

    const fetchBrands = async () => {
        try { const response = await brandService.getAll(); setBrands(response.data); }
        catch (error) { toast.error('Failed to load brands'); }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf'))) {
            setFile(selectedFile);
        } else {
            toast.error('Please select a valid PDF file');
            e.target.value = null;
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedBrand || !file) { toast.error('Select a brand and a file'); return; }
        try {
            setUploading(true);
            setUploadError('');
            const response = await productService.bulkCatalogUpload(selectedBrand, file);
            setResult(response.data);
            toast.success('Upload complete!');
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            const message = error.response?.data?.message || 'Catalogue import failed. Please try again.';
            setUploadError(message);
            toast.error(message);
        } finally { setUploading(false); }
    };

    return (
        <Modal open={isOpen} onClose={onClose} title="Bulk Import Catalog (PDF)">
            {!result ? (
                <form onSubmit={handleUpload} className="space-y-5">
                    {uploadError && <div role="alert" data-testid="catalogue-import-error" className="error-panel" style={{ background: 'var(--danger-soft)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>{uploadError}</div>}
                    <Field label="Select Brand" required>
                        <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="input-field" required>
                            <option value="">Select a brand</option>
                            {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                        </select>
                    </Field>

                    <div className="surface" style={{ padding: 32, textAlign: 'center', borderStyle: 'dashed', cursor: 'pointer', position: 'relative' }}>
                        <input type="file" accept=".pdf" onChange={handleFileChange} disabled={uploading} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                        <Upload size={28} className="mx-auto text-muted" />
                        <p className="text-sm font-semibold mt-2">{file ? file.name : <><span className="text-primary">Click to upload</span> or drag and drop</>}</p>
                        <p className="text-xs text-muted mt-1">PDF files only</p>
                    </div>

                    <div className="error-panel" style={{ background: 'var(--warning-soft)', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                        <p className="font-semibold text-sm">Important Note:</p>
                        <p className="text-xs mt-1">Product families, SKU variants, HSN codes, sizes, prices, descriptions and catalogue pictures will be extracted. Existing products are updated by SKU; stock and manually uploaded images are preserved.</p>
                    </div>

                    <Button type="submit" disabled={uploading || !file || !selectedBrand} className="btn-primary" style={{ width: '100%' }}>
                        {uploading ? <><Loader2 size={18} className="animate-spin" /> Processing PDF...</> : <><Upload size={18} /> Start Import</>}
                    </Button>
                </form>
            ) : (
                <div className="space-y-5">
                    <div className="text-center">
                        <CheckCircle size={40} className="mx-auto text-success" />
                        <h3 className="text-lg font-bold mt-2">Import Summary</h3>
                        <p className="text-sm text-secondary">Processed {file?.name}</p>
                        {result.batchId && <p className="text-xs text-muted mt-1">Import batch: <code data-testid="catalogue-import-batch-id">{result.batchId}</code></p>}
                    </div>
                    <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <div className="stat-card"><p className="stat-label">Total</p><p className="stat-value" style={{ fontSize: 22 }}>{result.totalProcessed}</p></div>
                        <div className="stat-card"><p className="stat-label">Created</p><p className="stat-value" style={{ fontSize: 22, color: 'var(--success)' }}>{result.createdCount}</p></div>
                        <div className="stat-card"><p className="stat-label">Updated</p><p className="stat-value" style={{ fontSize: 22, color: 'var(--info)' }}>{result.updatedCount}</p></div>
                        <div className="stat-card"><p className="stat-label">Images</p><p className="stat-value" style={{ fontSize: 22, color: 'var(--primary)' }}>{result.imagesLinkedCount || 0}</p></div>
                    </div>
                    {result.skippedCount > 0 && (
                        <div className="error-panel" style={{ background: 'var(--warning-soft)', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                            {result.skippedCount} rows skipped.
                        </div>
                    )}
                    {result.imageLinkFailures > 0 && (
                        <div className="error-panel" role="alert" style={{ background: 'var(--warning-soft)', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                            {result.imageLinkFailures} catalogue image links could not be saved. Product import counts reflect persisted products; review the warnings before cleanup.
                        </div>
                    )}
                    {result.errors?.length > 0 && (
                        <div className="error-panel" style={{ maxHeight: 120, overflowY: 'auto' }}>
                            <p className="font-semibold text-sm">Warnings ({result.errors.length})</p>
                            {result.errors.map((err, idx) => <p key={idx} className="text-xs mt-1">• {err}</p>)}
                        </div>
                    )}
                    <Button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>Close Summary</Button>
                </div>
            )}
        </Modal>
    );
};

export default BulkUploadModal;
