import React from 'react';
import { Button } from './Button';
import { EmptyState, ErrorState, LoadingSkeleton } from './Feedback';

function textOf(node) {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    return React.Children.toArray(node?.props?.children).map(textOf).join('');
}
// Adapts existing semantic table markup without changing row business logic.
export function Table({ children, caption = 'Records', mobile = true, className = '' }) {
    const parts = React.Children.toArray(children);
    const head = parts.find(part => part.type === 'thead');
    const headings = React.Children.toArray(React.Children.toArray(head?.props.children)[0]?.props.children).map(textOf);
    const decorate = node => {
        if (!React.isValidElement(node)) return node;
        if (node.type === 'tr') return React.cloneElement(node, {}, React.Children.map(node.props.children, (cell, index) => React.isValidElement(cell) ? React.cloneElement(cell, { 'data-label': headings[index] || 'Actions', scope: cell.type === 'th' ? 'col' : undefined }) : cell));
        if (node.type === 'tbody' || node.type === 'thead' || node.type === React.Fragment) return React.cloneElement(node, {}, React.Children.map(node.props.children, decorate));
        return node;
    };
    return <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}><table className={`data-table ${mobile ? 'mobile-records' : ''} ${className}`}><caption className="sr-only">{caption}</caption>{parts.map(decorate)}</table></div>;
}
export function DataTable({ columns, rows, loading, error, onRetry, emptyTitle, emptyDescription, emptyAction, caption, mobile = true }) {
    if (error) return <ErrorState message={error} onRetry={onRetry} />;
    if (loading) return <LoadingSkeleton />;
    if (!rows.length) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
    return <Table caption={caption} mobile={mobile}><thead><tr>{columns.map(col => <th key={col.key} className={col.numeric ? 'numeric' : ''}>{col.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>{columns.map(col => <td key={col.key} className={col.numeric ? 'numeric' : ''}>{col.render ? col.render(row) : row[col.key] ?? '—'}</td>)}</tr>)}</tbody></Table>;
}
export function Pagination({ page, totalPages, total, size, onPageChange, onSizeChange, loading, scope }) {
    return <div className="pagination"><span aria-live="polite">{total ? `${page * size + 1}–${Math.min((page + 1) * size, total)} of ${total}` : '0 records'}{scope && ` · ${scope}`}</span><div className="pagination-controls">
        {onSizeChange && <label className="flex items-center gap-2">Rows<select className="input-field" value={size} onChange={e => onSizeChange(Number(e.target.value))} disabled={loading}>{[10, 20, 50, 100].map(n => <option key={n}>{n}</option>)}</select></label>}
        <Button variant="secondary" size="sm" disabled={loading || page <= 0} onClick={() => onPageChange(page - 1)}>Previous</Button><span>Page {page + 1} of {Math.max(1, totalPages)}</span><Button variant="secondary" size="sm" disabled={loading || page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>Next</Button>
    </div></div>;
}
