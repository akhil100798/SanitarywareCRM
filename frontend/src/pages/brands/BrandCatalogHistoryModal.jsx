import { useState, useEffect } from 'react';
import { X, History, RotateCcw, Download, Calendar, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { catalogVersionService } from '../../services/productService';
import toast from 'react-hot-toast';

const BrandCatalogHistoryModal = ({ isOpen, onClose, brand }) => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rollingBackId, setRollingBackId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [confirmRollbackVersion, setConfirmRollbackVersion] = useState(null);

    useEffect(() => {
        if (isOpen && brand?.id) {
            fetchVersions();
        } else {
            setVersions([]);
            setConfirmRollbackVersion(null);
        }
    }, [isOpen, brand]);

    const fetchVersions = async () => {
        try {
            setLoading(true);
            const response = await catalogVersionService.getVersionsByBrand(brand.id);
            setVersions(response.data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load catalog versions');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCircular = async (version) => {
        try {
            setDownloadingId(version.id);
            const response = await catalogVersionService.downloadCircular(version.id);
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Price_Revision_Circular_${version.versionTag.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Price revision circular downloaded!');
        } catch (error) {
            toast.error('Failed to download circular');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleConfirmRollback = async () => {
        if (!confirmRollbackVersion) return;
        try {
            setRollingBackId(confirmRollbackVersion.id);
            await catalogVersionService.rollbackVersion(confirmRollbackVersion.id);
            toast.success(`Successfully rolled back ${confirmRollbackVersion.versionTag}!`);
            setConfirmRollbackVersion(null);
            fetchVersions();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Rollback failed');
        } finally {
            setRollingBackId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden transition-all duration-200 animate-in fade-in zoom-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100/70 text-blue-700 rounded-xl">
                            <History size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Catalog Versions & Price History</h2>
                            <p className="text-xs text-gray-500 font-medium">Brand: {brand?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <p className="text-sm font-medium">Loading catalog history...</p>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 space-y-2">
                            <FileText size={40} className="mx-auto text-slate-300" />
                            <h4 className="font-bold text-slate-700 text-sm">No Catalog Versions Recorded</h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                When you import a catalog PDF for this brand, a version snapshot will automatically be archived here with one-click rollback capabilities.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {versions.map((ver) => (
                                <div
                                    key={ver.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        ver.status === 'ROLLED_BACK'
                                            ? 'bg-slate-50/70 border-slate-200 opacity-75'
                                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-xs'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-bold text-sm text-slate-900">{ver.versionTag}</span>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                        ver.status === 'ACTIVE'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-slate-200 text-slate-700'
                                                    }`}
                                                >
                                                    {ver.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                                <span className="flex items-center space-x-1">
                                                    <FileText size={13} className="text-slate-400" />
                                                    <span>{ver.fileName}</span>
                                                </span>
                                                <span className="flex items-center space-x-1">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    <span>{new Date(ver.createdAt).toLocaleString()}</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 self-end sm:self-center">
                                            <button
                                                type="button"
                                                disabled={downloadingId === ver.id}
                                                onClick={() => handleDownloadCircular(ver)}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center space-x-1 border border-blue-200/60"
                                                title="Download dealer price circular CSV"
                                            >
                                                {downloadingId === ver.id ? (
                                                    <Loader2 size={13} className="animate-spin" />
                                                ) : (
                                                    <Download size={13} />
                                                )}
                                                <span>Circular CSV</span>
                                            </button>

                                            {ver.status === 'ACTIVE' && (
                                                <button
                                                    type="button"
                                                    disabled={rollingBackId === ver.id}
                                                    onClick={() => setConfirmRollbackVersion(ver)}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors flex items-center space-x-1 border border-rose-200/60"
                                                    title="Rollback all product prices changed in this version"
                                                >
                                                    <RotateCcw size={13} />
                                                    <span>Rollback</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats Strip */}
                                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="bg-slate-50 p-2 rounded-lg">
                                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Products</span>
                                            <span className="font-bold text-slate-800">{ver.totalProducts}</span>
                                        </div>
                                        <div className="bg-emerald-50/70 p-2 rounded-lg">
                                            <span className="text-emerald-700 block text-[10px] uppercase font-bold">New Created</span>
                                            <span className="font-bold text-emerald-800">+{ver.createdCount}</span>
                                        </div>
                                        <div className="bg-blue-50/70 p-2 rounded-lg">
                                            <span className="text-blue-700 block text-[10px] uppercase font-bold">Prices Revised</span>
                                            <span className="font-bold text-blue-800">{ver.updatedCount}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Rollback Confirmation Modal */}
                {confirmRollbackVersion && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in">
                            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-base font-bold text-slate-900">Confirm Price Rollback</h3>
                                <p className="text-xs text-slate-600">
                                    Are you sure you want to rollback <strong>{confirmRollbackVersion.versionTag}</strong>?
                                </p>
                                <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg mt-2 font-medium">
                                    All {confirmRollbackVersion.updatedCount} revised products will be restored to their previous MRPs, and newly created items will be deactivated.
                                </p>
                            </div>
                            <div className="flex space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmRollbackVersion(null)}
                                    className="w-full py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={rollingBackId != null}
                                    onClick={handleConfirmRollback}
                                    className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center justify-center space-x-1.5 shadow-xs"
                                >
                                    {rollingBackId != null ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                    <span>Confirm Rollback</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BrandCatalogHistoryModal;
