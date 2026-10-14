import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export const Button = forwardRef(function Button({ as: Component = 'button', variant = 'primary', size = 'md', loading = false, disabled, children, className = '', type = 'button', ...props }, ref) {
    const inactive = disabled || loading;
    const nativeProps = Component === 'button' ? { type, disabled: inactive } : {
        'aria-disabled': inactive || undefined,
        ...(inactive ? { tabIndex: -1, onClick: event => event.preventDefault() } : {})
    };
    return <Component ref={ref} className={`btn-${variant} btn-${size} ${className}`} aria-busy={loading || undefined} {...props} {...nativeProps}>
        {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{children}
    </Component>;
});

export function IconButton({ label, children, ...props }) {
    return <Button variant="ghost" className="icon-button" aria-label={label} title={label} {...props}>{children}</Button>;
}
