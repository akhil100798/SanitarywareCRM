import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { brandService, productService } from '../../services/productService';
import toast from 'react-hot-toast';

const BulkUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchBrands();
            setResult(null);
            setFile(null);
            setSelectedBrand('');
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
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
        } else {
            toast.error('Please select a valid PDF file');
            e.target.value = null;
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedBrand || !file) {
            toast.error('Please select a brand and a file');
            return;
        }

        try {
            setUploading(true);
            const response = await productService.bulkCatalogUpload(selectedBrand, file);
            setResult(response.data);
            toast.success('Upload completed!');
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Upload failed');
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
                    {!result ? (
                        <form onSubmit={handleUpload} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Brand
                                </label>
                                <select
                                    value={selectedBrand}
                                    onChange={(e) => setSelectedBrand(e.target.value)}
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
                                    <div className="text-xs text-gray-400">PDF files only (Max 10MB)</div>
                                </div>
                            </div>

                            <div className="bg-amber-50 rounded-lg p-4 flex items-start space-x-3">
                                <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-800">
                                    <p className="font-bold mb-1">Important Note:</p>
                                    <p>The PDF must be in the standard brand catalog table format (Material Group, Material Code, Description, MRP). Existing products will be updated by SKU, and new ones will be created.</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading || !file || !selectedBrand}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Processing PDF...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={20} />
                                        <span>Start Import</span>
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Import Summary</h3>
                                <p className="text-gray-500">Processing complete for {file?.name}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
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
                            </div>

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
