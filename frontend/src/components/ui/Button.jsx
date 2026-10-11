import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading = false, disabled, children, className = '', type = 'button', ...props }, ref) {
    return <button ref={ref} type={type} className={`btn-${variant} btn-${size} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{children}
    </button>;
});

export function IconButton({ label, children, ...props }) {
    return <Button variant="ghost" className="icon-button" aria-label={label} title={label} {...props}>{children}</Button>;
}
