import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

const NotFoundPage = () => (
  <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <section className="card-container max-w-md text-center">
      <Compass className="mx-auto mb-5 text-teal" size={42} aria-hidden="true" />
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you requested is unavailable.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" className="btn-secondary" onClick={() => window.history.back()}>
          Go back
        </button>
        <Link to="/dashboard" className="btn-primary">Home</Link>
      </div>
    </section>
  </main>
);

export default NotFoundPage;
