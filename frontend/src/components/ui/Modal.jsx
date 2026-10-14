import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

let locks = 0;
let originalOverflow;
export default function Modal({ open = true, onClose, title, children, wide = false, drawer = false, busy = false }) {
    const ref = useRef(null);
    const titleId = useId();
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        if (!open) return;
        const dialog = ref.current;
        const previous = document.activeElement;
        if (!locks++) { originalOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
        dialog.showModal();
        dialog.querySelector('[data-dialog-title]')?.focus();
        return () => {
            dialog.close();
            if (!--locks) document.body.style.overflow = originalOverflow;
            if (previous?.isConnected) previous.focus();
        };
    }, [open]);
    if (!open) return null;
    return <dialog ref={ref} className={`dialog ${wide ? 'dialog-wide' : ''} ${drawer ? 'dialog-drawer' : ''}`} aria-modal="true" aria-labelledby={titleId}
        onCancel={event => { event.preventDefault(); if (!busy) closeRef.current?.(); }}
        onClick={event => { if (event.target === ref.current && !busy) { const rect = ref.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeRef.current?.(); } }}>
        <header className="dialog-header"><h2 id={titleId} data-dialog-title tabIndex={-1}>{title}</h2><IconButton label="Close" disabled={busy} onClick={onClose}><X size={20} /></IconButton></header>
        <div className="dialog-body">{children}</div>
    </dialog>;
}
