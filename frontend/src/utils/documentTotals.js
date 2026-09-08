export const calculateDocumentTotals = ({ items = [], taxPercentage, discount, shippingCharge }) => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
    const taxAmount = subtotal * (Number(taxPercentage) || 0) / 100;
    const total = Math.max(0, subtotal + taxAmount + (Number(shippingCharge) || 0) - (Number(discount) || 0));
    return { subtotal, taxAmount, total };
};
