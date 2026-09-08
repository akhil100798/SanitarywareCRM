const normalize = (value) => String(value ?? '').toLowerCase();

export const filterPayments = (payments, query) => {
  const search = normalize(query).trim();
  if (!search) return payments;

  return payments.filter((payment) => [
    payment.paymentNumber,
    payment.orderNumber,
    payment.receivedByName,
  ].some((value) => normalize(value).includes(search)));
};
