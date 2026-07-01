export const formatMoney = (value) => {
  const number = Number(value || 0);
  return `INR ${number.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const formatDate = (value) => value || '-';

export const todayIso = () => new Date().toISOString().split('T')[0];

export const addDaysIso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export const joinAddress = (item) =>
  [item?.address, item?.city, item?.state, item?.pincode].filter(Boolean).join(', ');
