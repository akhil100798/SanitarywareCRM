import React from 'react';
import { Inbox, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({ title = 'No records found', description = 'Try changing your search or filters.', action }) {
    return <div className="state-panel"><Inbox size={28} aria-hidden="true" /><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function ErrorState({ title = 'Unable to load records', message = 'Please try again.', onRetry }) {
    return <div className="error-panel" role="alert"><div className="flex items-center gap-2 font-semibold"><AlertCircle size={18} aria-hidden="true" />{title}</div><p className="mt-1">{message}</p>{onRetry && <Button variant="secondary" className="mt-3" onClick={onRetry}>Try again</Button>}</div>;
}
export function LoadingSkeleton({ label = 'Loading records', rows = 4 }) {
    return <div role="status" aria-label={label} className="loading-skeleton"><span className="sr-only">{label}</span>{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ width: i % 2 ? '75%' : '100%', height: 28 }} />)}</div>;
}
