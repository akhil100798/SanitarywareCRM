import React, { useId } from 'react';
import { Button } from './Button';

export function Field({ label, help, error, required, children, id: suppliedId, className = '' }) {
    const generatedId = useId();
    const childArray = React.Children.toArray(children);
    const singleChild = childArray.length === 1 && React.isValidElement(childArray[0]) ? childArray[0] : null;
    const childProps = singleChild?.props || {};
    const id = suppliedId || childProps.id || generatedId;
    const description = [help && `${id}-help`, error && `${id}-error`, childProps['aria-describedby']].filter(Boolean).join(' ') || undefined;
    return <div className={`field ${className}`}>
        <label className="field-label" htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
        {singleChild
            ? React.cloneElement(singleChild, { id, required: required || childProps.required, 'aria-invalid': error ? true : childProps['aria-invalid'], 'aria-describedby': description })
            : children && <div id={id}>{children}</div>}
        {!children && <div style={{ minHeight: 40 }} aria-hidden="true" />}
        {help && <p className="field-help" id={`${id}-help`}>{help}</p>}
        {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>;
}

export function SearchInput({ value, onChange, onSearch, onClear, label = 'Search records', placeholder = 'Search…', disabled }) {
    return <form className="search-field" onSubmit={e => { e.preventDefault(); onSearch?.(); }}>
        <Field label={label}><div className="search-control">
            <input className="input-field" type="search" aria-label={label} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} />
            {onSearch && <Button type="submit" variant="secondary" disabled={disabled}>Search</Button>}
            {value && <Button variant="ghost" onClick={() => { onChange(''); onClear?.(); }} aria-label={`Clear ${label.toLowerCase()}`}>Clear</Button>}
        </div></Field>
    </form>;
}
