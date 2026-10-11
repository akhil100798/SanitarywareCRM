import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { Button } from './Button';

const Context = createContext(null);
export function ConfirmProvider({ children }) {
    const [request, setRequest] = useState(null);
    const resolver = useRef(null);
    const confirm = (message, options = {}) => new Promise(resolve => {
        resolver.current?.(false);
        resolver.current = resolve;
        setRequest({ message, ...options });
    });
    const finish = result => { resolver.current?.(result); resolver.current = null; setRequest(null); };
    useEffect(() => () => resolver.current?.(false), []);
    return <Context.Provider value={confirm}>{children}<Modal open={!!request} onClose={() => finish(false)} title={request?.title || 'Confirm action'}>
        <p className="text-slate-600 mb-6">{request?.message}</p><div className="form-actions"><Button variant="secondary" onClick={() => finish(false)}>Cancel</Button><Button variant={request?.variant || 'danger'} onClick={() => finish(true)}>{request?.confirmLabel || 'Confirm'}</Button></div>
    </Modal></Context.Provider>;
}
export const useConfirm = () => useContext(Context);
