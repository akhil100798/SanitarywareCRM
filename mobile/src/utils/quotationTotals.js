export const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const roundMoney = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

export const calculateLineTotal = (item) => {
  const quantity = Math.max(0, toNumber(item?.quantity));
  const unitPrice = Math.max(0, toNumber(item?.unitPrice));
  const discountPercentage = Math.min(100, Math.max(0, toNumber(item?.discountPercentage)));
  const gross = quantity * unitPrice;
  return roundMoney(gross - (gross * discountPercentage) / 100);
};

export const calculateQuotationTotals = (items = [], taxPercentage = 0, discount = 0) => {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + calculateLineTotal(item), 0));
  const normalizedTaxPercentage = Math.max(0, toNumber(taxPercentage));
  const normalizedDiscount = Math.max(0, toNumber(discount));
  const taxAmount = roundMoney((subtotal * normalizedTaxPercentage) / 100);
  const total = roundMoney(subtotal + taxAmount - normalizedDiscount);

  return {
    subtotal,
    taxAmount,
    total,
    discount: normalizedDiscount,
    taxPercentage: normalizedTaxPercentage
  };
};

export const buildQuotationPayload = (formState) => {
  const items = (formState.items || []).map((item) => ({
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    quantity: Math.max(0, toNumber(item.quantity)),
    unitPrice: Math.max(0, toNumber(item.unitPrice)),
    discountPercentage: Math.min(100, Math.max(0, toNumber(item.discountPercentage))),
    lineTotal: calculateLineTotal(item),
    notes: item.notes || ''
  }));
  const totals = calculateQuotationTotals(items, formState.taxPercentage, formState.discount);

  return {
    customerId: formState.customerId,
    quotationDate: formState.quotationDate,
    validUntil: formState.validUntil,
    taxPercentage: totals.taxPercentage,
    taxAmount: totals.taxAmount,
    discount: totals.discount,
    subtotal: totals.subtotal,
    total: totals.total,
    notes: formState.notes || '',
    termsAndConditions: formState.termsAndConditions || '',
    items
  };
};
