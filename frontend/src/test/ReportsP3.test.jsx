import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ReportsPage } from '../pages/reports/ReportsPage';
import reportService from '../services/reportService';

vi.mock('../services/reportService', () => ({
    default: {
        getSalesSummary: vi.fn(),
        getGstTaxSummary: vi.fn(),
        getPaymentAging: vi.fn(),
        getDeadStock: vi.fn(),
        getBrandMargins: vi.fn(),
        getCustomerOutstanding: vi.fn(),
        getDistributorOutstanding: vi.fn(),
        getPaymentSummary: vi.fn(),
        getPurchaseSummary: vi.fn(),
        getInventorySummary: vi.fn(),
        exportGstTaxSummary: vi.fn(),
        exportPaymentAging: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('ReportsPage P3 Modules', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders GST Tax Summary with HSN breakdown and invoices', async () => {
        reportService.getSalesSummary.mockResolvedValueOnce({
            data: { totalSales: 100000, totalOrders: 5 }
        });

        reportService.getGstTaxSummary.mockResolvedValueOnce({
            data: {
                startDate: '2026-11-01',
                endDate: '2026-11-30',
                totalInvoices: 12,
                totalTaxableAmount: 200000,
                totalCgst: 18000,
                totalSgst: 18000,
                totalIgst: 0,
                totalTaxAmount: 36000,
                totalInvoiceValue: 236000,
                hsnBreakdown: [
                    { hsnCode: '6910', taxableAmount: 200000, cgst: 18000, sgst: 18000, igst: 0, totalTax: 36000 }
                ],
                invoices: [
                    {
                        invoiceNumber: 'INV-2026-001',
                        invoiceDate: '2026-11-15',
                        customerName: 'Acme Builders',
                        customerGstin: '27AAAAA0000A1Z5',
                        placeOfSupply: 'Maharashtra',
                        taxableAmount: 100000,
                        cgst: 9000,
                        sgst: 9000,
                        igst: 0,
                        totalAmount: 118000
                    }
                ]
            }
        });

        render(<ReportsPage />);

        // Switch to GST tab
        const gstTab = screen.getByRole('button', { name: /gst tax summary/i });
        fireEvent.click(gstTab);

        await waitFor(() => {
            expect(reportService.getGstTaxSummary).toHaveBeenCalled();
        });

        expect(await screen.findByText('HSN Code Breakdown (GSTR-1 Table 12)')).toBeInTheDocument();
        expect(screen.getByText('6910')).toBeInTheDocument();
        expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
        expect(screen.getByText('Acme Builders')).toBeInTheDocument();
    });

    it('renders Payment Aging Schedule with age buckets', async () => {
        reportService.getSalesSummary.mockResolvedValueOnce({
            data: { totalSales: 50000 }
        });

        reportService.getPaymentAging.mockResolvedValueOnce({
            data: {
                asOfDate: '2026-11-21',
                totalOutstanding: 75000,
                bucket0To30: 25000,
                bucket31To60: 20000,
                bucket61To90: 15000,
                bucket90Plus: 15000,
                customerCount: 1,
                customers: [
                    {
                        customerId: 'cust-1',
                        customerName: 'Premier Interiors',
                        phoneNumber: '9876543210',
                        company: 'Premier Group',
                        totalBilled: 100000,
                        totalPaid: 25000,
                        totalOutstanding: 75000,
                        bucket0To30: 25000,
                        bucket31To60: 20000,
                        bucket61To90: 15000,
                        bucket90Plus: 15000
                    }
                ]
            }
        });

        render(<ReportsPage />);

        const agingTab = screen.getByRole('button', { name: /payment aging buckets/i });
        fireEvent.click(agingTab);

        await waitFor(() => {
            expect(reportService.getPaymentAging).toHaveBeenCalled();
        });

        expect(await screen.findByText('Customer Receivables Aging Schedule')).toBeInTheDocument();
        expect(screen.getByText('Premier Interiors')).toBeInTheDocument();
        expect(screen.getByText('9876543210')).toBeInTheDocument();
    });

    it('renders Dead Stock report with tied-up capital', async () => {
        reportService.getSalesSummary.mockResolvedValueOnce({
            data: { totalSales: 50000 }
        });

        reportService.getDeadStock.mockResolvedValueOnce({
            data: {
                thresholdDays: 90,
                totalDeadStockItems: 1,
                totalTiedUpCapital: 45000,
                items: [
                    {
                        productId: 'prod-dead-1',
                        productName: 'Legacy Ceramic Basin',
                        sku: 'BAS-LEG-01',
                        brandName: 'Jaquar',
                        categoryName: 'Wash Basins',
                        stockQuantity: 15,
                        purchasePrice: 3000,
                        tiedUpCapital: 45000,
                        lastSaleDate: '2026-05-10',
                        daysSinceLastSale: 195
                    }
                ]
            }
        });

        render(<ReportsPage />);

        const deadStockTab = screen.getByRole('button', { name: /dead-stock/i });
        fireEvent.click(deadStockTab);

        await waitFor(() => {
            expect(reportService.getDeadStock).toHaveBeenCalled();
        });

        expect(await screen.findByText('Legacy Ceramic Basin')).toBeInTheDocument();
        expect(screen.getByText('BAS-LEG-01')).toBeInTheDocument();
        expect(screen.getByText('195 days')).toBeInTheDocument();
    });

    it('renders Brand Gross Margins report', async () => {
        reportService.getSalesSummary.mockResolvedValueOnce({
            data: { totalSales: 50000 }
        });

        reportService.getBrandMargins.mockResolvedValueOnce({
            data: {
                totalRevenue: 500000,
                totalCost: 350000,
                totalGrossMargin: 150000,
                overallGrossMarginPercent: 30.0,
                brands: [
                    {
                        brandName: 'Kohler',
                        totalUnitsSold: 25,
                        totalRevenue: 500000,
                        totalCost: 350000,
                        grossMargin: 150000,
                        grossMarginPercent: 30.0
                    }
                ]
            }
        });

        render(<ReportsPage />);

        const brandMarginsTab = screen.getByRole('button', { name: /brand gross margins/i });
        fireEvent.click(brandMarginsTab);

        await waitFor(() => {
            expect(reportService.getBrandMargins).toHaveBeenCalled();
        });

        expect(await screen.findByText('Brand-Wise Gross Margins & Profitability (1)')).toBeInTheDocument();
        expect(screen.getByText('Kohler')).toBeInTheDocument();
        expect(screen.getAllByText('30%').length).toBeGreaterThanOrEqual(1);
    });
});
