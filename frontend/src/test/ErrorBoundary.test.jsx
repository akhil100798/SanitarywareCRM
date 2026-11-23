import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

const FaultyComponent = ({ shouldThrow }) => {
    if (shouldThrow) {
        throw new Error('Test crash in child component');
    }
    return <div>Normal child content</div>;
};

describe('ErrorBoundary', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('renders child components when no error occurs', () => {
        render(
            <ErrorBoundary>
                <FaultyComponent shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Normal child content')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('catches render error and displays friendly fallback UI', () => {
        render(
            <ErrorBoundary>
                <FaultyComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText(/An unexpected error occurred while rendering this view/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Go to Dashboard/i })).toBeInTheDocument();
    });

    it('redirects to dashboard when Go to Dashboard is clicked', () => {
        delete window.location;
        window.location = { href: '', reload: vi.fn() };

        render(
            <ErrorBoundary>
                <FaultyComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        const dashboardBtn = screen.getByRole('button', { name: /Go to Dashboard/i });
        fireEvent.click(dashboardBtn);

        expect(window.location.href).toBe('/dashboard');
    });
});
