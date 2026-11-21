const normalize = (value) => String(value ?? '').toLowerCase();

export const filterPayments = (payments, query) => {
  const search = normalize(query).trim();
  if (!search) return payments;
  const tokens = search.split(/\s+/).filter(Boolean);

  return payments.filter((payment) => {
    const fields = [
      payment.paymentNumber,
      payment.orderNumber,
      payment.customerName,
      payment.receivedByName,
      payment.referenceNumber,
      payment.notes,
    ].map(normalize);

    // Exact phrase match (e.g. "Aditya Roy")
    if (fields.some((f) => f.includes(search))) return true;

    // Multi-token match across all fields
    return tokens.every((token) => fields.some((f) => f.includes(token)));
  });
};
