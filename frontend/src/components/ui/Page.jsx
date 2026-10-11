import React from 'react';

export function PageHeader({ title, description, actions }) {
    return <div className="page-header"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</div>;
}
export function PageSection({ title, children, className = '' }) {
    return <section className={`surface ${className}`}>{title && <h2 className="section-heading">{title}</h2>}{children}</section>;
}
export function StatCard({ label, value, note }) {
    return <div className="stat-card"><p className="stat-label">{label}</p><p className="stat-value">{value}</p>{note && <p className="stat-note">{note}</p>}</div>;
}
