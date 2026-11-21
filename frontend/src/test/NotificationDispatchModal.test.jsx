import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NotificationDispatchModal from '../components/NotificationDispatchModal';
import notificationService from '../services/notificationService';

vi.mock('../services/notificationService', () => ({
    default: {
        getDispatchLogs: vi.fn(),
        retryDispatch: vi.fn(),
        triggerLowStock: vi.fn(),
        triggerPaymentDue: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('NotificationDispatchModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not render when isOpen is false', () => {
        render(<NotificationDispatchModal isOpen={false} onClose={() => {}} />);
        expect(screen.queryByText('Automated Notification Dispatch Center')).not.toBeInTheDocument();
    });

    it('renders dispatch records and allows retry', async () => {
        notificationService.getDispatchLogs.mockResolvedValue({
            data: {
                content: [
                    {
                        id: 'notif-1',
                        channel: 'EMAIL',
                        notificationType: 'PAYMENT_DUE',
                        recipient: 'finance@client.com',
                        subject: 'Payment Reminder: Order ORD-100',
                        deliveryStatus: 'FAILED',
                        retryCount: 1,
                        errorMessage: 'SMTP connection timeout',
                        dispatchedAt: '2026-11-21T10:00:00'
                    }
                ],
                totalPages: 1,
                totalElements: 1
            }
        });

        notificationService.retryDispatch.mockResolvedValueOnce({
            data: {
                id: 'notif-1',
                deliveryStatus: 'SENT'
            }
        });

        render(<NotificationDispatchModal isOpen={true} onClose={() => {}} />);

        expect(screen.getByText('Automated Notification Dispatch Center')).toBeInTheDocument();
        await waitFor(() => {
            expect(notificationService.getDispatchLogs).toHaveBeenCalled();
        });

        expect(await screen.findByText('finance@client.com')).toBeInTheDocument();
        expect(screen.getByText('PAYMENT_DUE')).toBeInTheDocument();
        expect(screen.getByText('SMTP connection timeout')).toBeInTheDocument();

        // Click Retry
        const retryBtn = screen.getByRole('button', { name: /retry/i });
        fireEvent.click(retryBtn);

        await waitFor(() => {
            expect(notificationService.retryDispatch).toHaveBeenCalledWith('notif-1');
        });
    });

    it('triggers manual low-stock check', async () => {
        notificationService.getDispatchLogs.mockResolvedValue({
            data: { content: [], totalPages: 1, totalElements: 0 }
        });

        notificationService.triggerLowStock.mockResolvedValueOnce({
            data: { message: 'Low-stock check completed' }
        });

        render(<NotificationDispatchModal isOpen={true} onClose={() => {}} />);

        const checkStockBtn = screen.getByRole('button', { name: /check low stock/i });
        fireEvent.click(checkStockBtn);

        await waitFor(() => {
            expect(notificationService.triggerLowStock).toHaveBeenCalled();
        });
    });
});
