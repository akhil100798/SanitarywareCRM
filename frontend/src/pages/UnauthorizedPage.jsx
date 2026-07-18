import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const UnauthorizedPage = () => (
    <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card-container max-w-lg text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <ShieldAlert size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
            <p className="mt-2 text-slate-500">{'You don\u2019t have access to this page.'}</p>
            <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
                Back to dashboard
            </Link>
        </div>
    </div>
);

export default UnauthorizedPage;
