import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button component with automatic async click debouncing,
 * loading spinner, and disabled prevention.
 */
export const Button = ({
    children,
    onClick,
    loading: externalLoading,
    disabled,
    type = 'button',
    className = '',
    variant = 'primary',
    ...props
}) => {
    const [internalLoading, setInternalLoading] = useState(false);
    const isLoading = externalLoading || internalLoading;

    const handleClick = async (e) => {
        if (isLoading || disabled) {
            e.preventDefault();
            return;
        }

        if (onClick) {
            const result = onClick(e);
            if (result && typeof result.then === 'function') {
                setInternalLoading(true);
                try {
                    await result;
                } finally {
                    setInternalLoading(false);
                }
            }
        }
    };

    const variantStyles = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
        secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
    };

    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            onClick={handleClick}
            className={`inline-flex items-center justify-center font-medium px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant] || variantStyles.primary} ${className}`}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {children}
        </button>
    );
};

export default Button;
