const monetaryMetrics = new Set([
  'Total Sales Value', 'Total Tax Collected', 'Total Discount Given', 'Average Order Value',
  'Total Receivables Outstanding', 'Total Payables Outstanding', 'Total Received',
  'Total Purchases', 'Total Paid', 'Total Payables', 'Total Catalog Value'
]);

export function formatReportMetric(label, value) {
  if (typeof value !== 'number') return String(value);
  const formatted = value.toLocaleString('en-IN');
  return monetaryMetrics.has(label.trim().replace(/\s+/g, ' ')) ? `₹${formatted}` : formatted;
}
