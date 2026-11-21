import React, { useState, useEffect } from 'react';
import { 
    MessageCircle, 
    Share2, 
    Send, 
    Copy, 
    Check, 
    ExternalLink, 
    FileText, 
    Download, 
    QrCode, 
    Phone, 
    User, 
    Calendar, 
    X,
    ShieldCheck,
    CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import quotationService from '../../services/quotationService';

export default function ShareWhatsAppModal({ isOpen, onClose, quotation, onSuccess }) {
    if (!isOpen || !quotation) return null;

    const initialPhone = quotation.customerPhone || quotation.customer?.phoneNumber || '';
    const [recipientPhone, setRecipientPhone] = useState(initialPhone);
    const [recipientName, setRecipientName] = useState(quotation.customerName || quotation.customer?.name || 'Valued Customer');
    const [sendingCloud, setSendingCloud] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [copiedMessage, setCopiedMessage] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    useEffect(() => {
        setRecipientPhone(quotation.customerPhone || quotation.customer?.phoneNumber || '');
        setRecipientName(quotation.customerName || quotation.customer?.name || 'Valued Customer');
    }, [quotation]);

    // Portal Verification URL
    const baseUrl = window.location.origin;
    const shareToken = quotation.shareToken || '';
    const portalUrl = shareToken 
        ? `${baseUrl}/portal/quotations/${shareToken}`
        : `${baseUrl}/portal/quotations/view`;

    // Formatted WhatsApp Message
    const formattedTotal = Number(quotation.total || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const messageText = 
`Hello ${recipientName},

Here is your official quotation *${quotation.quotationNumber}* from *Sanitaryware Store*.

*Quotation Summary:*
* Items Count: ${quotation.items?.length || 0} items
* Subtotal: Rs. ${Number(quotation.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
* GST: Rs. ${Number(quotation.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
* *Grand Total: Rs. ${formattedTotal}*
* Valid Until: ${quotation.validUntil || '7 days from quote date'}

You can review line items, verify authenticity, and download the branded PDF quotation online:
${portalUrl}

Thank you for choosing us!
*Sanitaryware CRM*`;

    const getCleanPhone = (phone) => {
        let clean = phone.replace(/[^0-9]/g, '');
        if (clean.length === 10) {
            clean = '91' + clean;
        } else if (clean.startsWith('0') && clean.length === 11) {
            clean = '91' + clean.substring(1);
        }
        return clean;
    };

    // 1. Direct Client-side WhatsApp Web / App Dispatch
    const handleOpenWhatsAppWeb = () => {
        const clean = getCleanPhone(recipientPhone);
        if (!clean) {
            toast.error('Please enter a valid phone number');
            return;
        }
        const waUrl = `https://wa.me/${clean}?text=${encodeURIComponent(messageText)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        toast.success('Opened in WhatsApp!');
        if (onSuccess) onSuccess();
    };

    // 2. Dispatch via Cloud WhatsApp API (Twilio / Backend)
    const handleSendCloudWhatsApp = async () => {
        const clean = getCleanPhone(recipientPhone);
        if (!clean) {
            toast.error('Please enter a valid phone number');
            return;
        }

        setSendingCloud(true);
        const toastId = toast.loading('Dispatching quotation via Cloud WhatsApp API...');
        try {
            const response = await quotationService.sendWhatsApp(quotation.id, {
                phoneNumber: clean
            });

            if (response.data?.status === 'SENT') {
                toast.success('Dispatched to WhatsApp successfully!', { id: toastId });
            } else if (response.data?.status === 'SIMULATED') {
                toast.success('Sandbox mode: Message simulated and audit logged!', { id: toastId });
            } else {
                toast.error(response.data?.detail || 'Dispatch status: ' + response.data?.status, { id: toastId });
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to dispatch via Cloud WhatsApp', { id: toastId });
        } finally {
            setSendingCloud(false);
        }
    };

    // 3. Direct Branded PDF Download
    const handleDownloadPdf = async () => {
        setDownloadingPdf(true);
        const toastId = toast.loading('Generating branded PDF with QR Code...');
        try {
            const response = await quotationService.downloadPdf(quotation.id);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `quotation-${quotation.quotationNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Branded PDF downloaded with QR code verification!', { id: toastId });
        } catch (error) {
            toast.error('Failed to download PDF', { id: toastId });
        } finally {
            setDownloadingPdf(false);
        }
    };

    // 4. Copy Message to Clipboard
    const handleCopyMessage = () => {
        navigator.clipboard.writeText(messageText);
        setCopiedMessage(true);
        toast.success('Message copied to clipboard');
        setTimeout(() => setCopiedMessage(false), 2000);
    };

    // 5. Copy Portal Verification Link
    const handleCopyPortalLink = () => {
        navigator.clipboard.writeText(portalUrl);
        setCopiedLink(true);
        toast.success('Portal verification link copied!');
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute right-5 top-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <MessageCircle size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Share Quotation via WhatsApp</h2>
                            <p className="text-emerald-100 text-xs font-medium">
                                Direct messaging, digital customer portal, and branded QR code verification
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/15 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-white/15 font-semibold">
                            Quote: {quotation.quotationNumber}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white/15 font-semibold">
                            Grand Total: Rs. {formattedTotal}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white/15">
                            Valid Until: {quotation.validUntil || 'N/A'}
                        </span>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                    {/* Recipient Phone & Name Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <User size={13} className="text-slate-400" />
                                Customer / Recipient Name
                            </label>
                            <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                placeholder="Customer Name"
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <Phone size={13} className="text-slate-400" />
                                WhatsApp Phone Number
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={recipientPhone}
                                    onChange={(e) => setRecipientPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all outline-none"
                                />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">10-digit Indian mobile or international format with country code.</p>
                        </div>
                    </div>

                    {/* WhatsApp Live Preview Bubble */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <MessageCircle size={13} className="text-emerald-600" />
                                WhatsApp Message Preview
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyMessage}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-all"
                            >
                                {copiedMessage ? <Check size={13} /> : <Copy size={13} />}
                                {copiedMessage ? 'Copied' : 'Copy Message'}
                            </button>
                        </div>

                        <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                            <div className="max-w-md bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-sm border border-slate-100 text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed relative">
                                {messageText}
                                <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                                    <span>Just now</span>
                                    <CheckCircle2 size={11} className="text-emerald-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Portal Verification & QR Code Info Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                                <QrCode size={24} className="text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-emerald-600" />
                                    Customer Self-Service Portal & Dynamic QR
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-sm">
                                    {portalUrl}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <button
                                type="button"
                                onClick={handleCopyPortalLink}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm flex-1 sm:flex-none justify-center"
                            >
                                {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                {copiedLink ? 'Copied Link' : 'Copy Link'}
                            </button>
                            <a
                                href={portalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm flex-1 sm:flex-none justify-center"
                            >
                                <ExternalLink size={12} />
                                View Portal
                            </a>
                        </div>
                    </div>

                    {/* Primary Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* Option 1: Direct WhatsApp Web / App */}
                        <button
                            type="button"
                            onClick={handleOpenWhatsAppWeb}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all"
                        >
                            <MessageCircle size={17} />
                            Open in WhatsApp Web / App
                        </button>

                        {/* Option 2: Cloud API Dispatch */}
                        <button
                            type="button"
                            onClick={handleSendCloudWhatsApp}
                            disabled={sendingCloud}
                            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                        >
                            <Send size={16} />
                            {sendingCloud ? 'Dispatching...' : 'Send via Cloud WhatsApp API'}
                        </button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                            <Download size={14} className="text-emerald-600" />
                            {downloadingPdf ? 'Generating...' : 'Download Branded PDF (with QR)'}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold transition-all ml-auto"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
