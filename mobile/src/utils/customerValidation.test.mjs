import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOMER_TYPES,
  isValidPhoneNumber,
  isValidGstin,
  isValidPincode,
  isValidEmail,
  validateCustomerForm,
  buildCustomerPayload
} from './customerValidation.js';

test('CUSTOMER_TYPES contains standard CRM categories', () => {
  assert.deepEqual(CUSTOMER_TYPES, ['RETAIL', 'WHOLESALE', 'CONTRACTOR', 'BUILDER']);
});

test('isValidPhoneNumber validates Indian & international 10-15 digit formats', () => {
  assert.equal(isValidPhoneNumber('9876543210'), true);
  assert.equal(isValidPhoneNumber('+91 98765 43210'), true);
  assert.equal(isValidPhoneNumber('+91 (080) 1234-5678'), true);
  assert.equal(isValidPhoneNumber('12345'), false); // too short
  assert.equal(isValidPhoneNumber('1234567890123456'), false); // too long
  assert.equal(isValidPhoneNumber('98765abcde'), false); // invalid chars
  assert.equal(isValidPhoneNumber(''), false);
  assert.equal(isValidPhoneNumber(null), false);
});

test('isValidGstin validates 15-character Indian GST format', () => {
  assert.equal(isValidGstin('29ABCDE1234F1Z5'), true);
  assert.equal(isValidGstin('27AAAAA0000A1Z5'), true);
  assert.equal(isValidGstin(''), true); // optional
  assert.equal(isValidGstin(null), true); // optional
  assert.equal(isValidGstin('INVALID_GST'), false);
  assert.equal(isValidGstin('29ABCDE1234F1Z'), false); // 14 chars
  assert.equal(isValidGstin('29ABCDE1234F1Z50'), false); // 16 chars
});

test('isValidPincode validates 6-digit Indian PIN codes', () => {
  assert.equal(isValidPincode('560001'), true);
  assert.equal(isValidPincode('110001'), true);
  assert.equal(isValidPincode(''), true); // optional
  assert.equal(isValidPincode(null), true); // optional
  assert.equal(isValidPincode('012345'), false); // cannot start with 0
  assert.equal(isValidPincode('56001'), false); // 5 digits
  assert.equal(isValidPincode('5600001'), false); // 7 digits
  assert.equal(isValidPincode('56000A'), false); // non-numeric
});

test('isValidEmail validates standard email addresses', () => {
  assert.equal(isValidEmail('test@example.com'), true);
  assert.equal(isValidEmail('user.name+tag@sub.domain.co.in'), true);
  assert.equal(isValidEmail(''), true); // optional
  assert.equal(isValidEmail(null), true); // optional
  assert.equal(isValidEmail('notanemail'), false);
  assert.equal(isValidEmail('user@'), false);
  assert.equal(isValidEmail('@domain.com'), false);
});

test('validateCustomerForm flags missing required fields and invalid formats', () => {
  const emptyResult = validateCustomerForm({});
  assert.equal(emptyResult.isValid, false);
  assert.equal(emptyResult.errors.name, 'Customer name is required');
  assert.equal(emptyResult.errors.phoneNumber, 'Phone number is required');

  const invalidResult = validateCustomerForm({
    name: 'Acme Ceramics',
    phoneNumber: '123',
    email: 'bad-email',
    gstNumber: 'BADGST',
    pincode: '999',
    customerType: 'SUPER_VIP'
  });
  assert.equal(invalidResult.isValid, false);
  assert.equal(invalidResult.errors.phoneNumber, 'Phone number must have 10-15 digits');
  assert.equal(invalidResult.errors.email, 'Valid email is required');
  assert.equal(invalidResult.errors.gstNumber, 'GSTIN must be 15 characters (e.g. 29ABCDE1234F1Z5)');
  assert.equal(invalidResult.errors.pincode, 'Pincode must be 6 digits (e.g. 560001)');
  assert.match(invalidResult.errors.customerType, /Customer type must be one of/);
});

test('validateCustomerForm passes for valid customer data', () => {
  const result = validateCustomerForm({
    name: 'Sleek Bath & Tiles',
    phoneNumber: '9876543210',
    email: 'sleek@example.com',
    gstNumber: '29ABCDE1234F1Z5',
    customerType: 'CONTRACTOR',
    pincode: '560001'
  });
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('buildCustomerPayload formats fields and trims whitespace cleanly', () => {
  const payload = buildCustomerPayload({
    name: '  Royal Ceramics  ',
    phoneNumber: ' 9876543210 ',
    email: ' royal@example.com ',
    company: ' Royal Sanitaryware Pvt Ltd ',
    gstNumber: ' 29abcde1234f1z5 ',
    customerType: 'WHOLESALE',
    city: ' Bangalore ',
    state: ' Karnataka ',
    pincode: ' 560001 ',
    notes: ' Preferred contractor ',
    isActive: true
  });

  assert.equal(payload.name, 'Royal Ceramics');
  assert.equal(payload.phoneNumber, '9876543210');
  assert.equal(payload.email, 'royal@example.com');
  assert.equal(payload.company, 'Royal Sanitaryware Pvt Ltd');
  assert.equal(payload.gstNumber, '29ABCDE1234F1Z5');
  assert.equal(payload.customerType, 'WHOLESALE');
  assert.equal(payload.city, 'Bangalore');
  assert.equal(payload.state, 'Karnataka');
  assert.equal(payload.pincode, '560001');
  assert.equal(payload.notes, 'Preferred contractor');
  assert.equal(payload.isActive, true);
});
