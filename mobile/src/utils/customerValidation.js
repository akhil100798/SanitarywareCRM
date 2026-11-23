export const CUSTOMER_TYPES = ['RETAIL', 'WHOLESALE', 'CONTRACTOR', 'BUILDER'];

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidPhoneNumber = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string') return false;
  const trimmed = rawPhone.trim();
  if (!trimmed) return false;
  if (!/^\+?[0-9\s()\-.]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/^\+/, '').replace(/[\s()\-.]/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

export const isValidGstin = (rawGstin) => {
  if (!rawGstin || typeof rawGstin !== 'string') return true; // optional
  const trimmed = rawGstin.trim().toUpperCase();
  if (!trimmed) return true;
  return GSTIN_REGEX.test(trimmed);
};

export const isValidPincode = (rawPincode) => {
  if (!rawPincode || typeof rawPincode !== 'string') return true; // optional
  const trimmed = rawPincode.trim();
  if (!trimmed) return true;
  return PINCODE_REGEX.test(trimmed);
};

export const isValidEmail = (rawEmail) => {
  if (!rawEmail || typeof rawEmail !== 'string') return true; // optional
  const trimmed = rawEmail.trim();
  if (!trimmed) return true;
  return EMAIL_REGEX.test(trimmed);
};

export const validateCustomerForm = (form) => {
  const errors = {};

  if (!form?.name || !form.name.trim()) {
    errors.name = 'Customer name is required';
  }

  if (!form?.phoneNumber || !form.phoneNumber.trim()) {
    errors.phoneNumber = 'Phone number is required';
  } else if (!isValidPhoneNumber(form.phoneNumber)) {
    errors.phoneNumber = 'Phone number must have 10-15 digits';
  }

  if (form?.alternatePhone && form.alternatePhone.trim() && !isValidPhoneNumber(form.alternatePhone)) {
    errors.alternatePhone = 'Alternate phone must have 10-15 digits';
  }

  if (form?.email && form.email.trim() && !isValidEmail(form.email)) {
    errors.email = 'Valid email is required';
  }

  if (form?.gstNumber && form.gstNumber.trim() && !isValidGstin(form.gstNumber)) {
    errors.gstNumber = 'GSTIN must be 15 characters (e.g. 29ABCDE1234F1Z5)';
  }

  if (form?.pincode && form.pincode.trim() && !isValidPincode(form.pincode)) {
    errors.pincode = 'Pincode must be 6 digits (e.g. 560001)';
  }

  if (form?.customerType && !CUSTOMER_TYPES.includes(form.customerType)) {
    errors.customerType = `Customer type must be one of: ${CUSTOMER_TYPES.join(', ')}`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const buildCustomerPayload = (form) => {
  return {
    name: form.name?.trim() || '',
    phoneNumber: form.phoneNumber?.trim() || '',
    alternatePhone: form.alternatePhone?.trim() || null,
    email: form.email?.trim() || null,
    company: form.company?.trim() || null,
    gstNumber: form.gstNumber ? form.gstNumber.trim().toUpperCase() : null,
    customerType: form.customerType || 'RETAIL',
    billingAddress: form.billingAddress?.trim() || null,
    shippingAddress: form.shippingAddress?.trim() || null,
    city: form.city?.trim() || null,
    state: form.state?.trim() || null,
    pincode: form.pincode?.trim() || null,
    notes: form.notes?.trim() || null,
    isActive: form.isActive !== false
  };
};
