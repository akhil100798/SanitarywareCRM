import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { X } from 'lucide-react-native';
import AppTextInput from './AppTextInput';
import FormErrorBanner from './FormErrorBanner';
import { customerService } from '../api/services';
import { getErrorMessage } from '../api/client';
import { colors } from '../theme/colors';

const CUSTOMER_TYPES = [
  { label: 'Retail', value: 'RETAIL' },
  { label: 'Contractor', value: 'CONTRACTOR' },
  { label: 'Wholesale', value: 'WHOLESALE' },
  { label: 'Builder', value: 'BUILDER' }
];

const CreateCustomerModal = ({ visible, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [customerType, setCustomerType] = useState('RETAIL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setName('');
    setPhoneNumber('');
    setEmail('');
    setCompany('');
    setGstNumber('');
    setState('');
    setCity('');
    setBillingAddress('');
    setCustomerType('RETAIL');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Valid 10-digit phone number is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = {
        name: name.trim(),
        phoneNumber: cleanPhone,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        gstNumber: gstNumber.trim() ? gstNumber.trim().toUpperCase() : undefined,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        customerType,
        isActive: true
      };

      const created = await customerService.create(payload);
      resetForm();
      onSuccess(created);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>New Customer</Text>
              <Text style={styles.subtitle}>Add customer for billing & quotations</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <FormErrorBanner message={error} />

            <AppTextInput
              label="Customer / Client Name *"
              placeholder="e.g. Rohit Verma"
              value={name}
              onChangeText={setName}
            />

            <AppTextInput
              label="Phone Number *"
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />

            <AppTextInput
              label="Company / Project Name"
              placeholder="e.g. Verma Luxury Living"
              value={company}
              onChangeText={setCompany}
            />

            <AppTextInput
              label="Email Address"
              placeholder="e.g. rohit@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <AppTextInput
              label="GSTIN / Tax ID"
              placeholder="e.g. 29ABCDE1234F1Z5"
              autoCapitalize="characters"
              value={gstNumber}
              onChangeText={setGstNumber}
            />

            <AppTextInput
              label="State / Province"
              placeholder="e.g. Karnataka"
              value={state}
              onChangeText={setState}
            />

            <Text style={styles.typeLabel}>Customer Category</Text>
            <View style={styles.typeGrid}>
              {CUSTOMER_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeBtn, customerType === type.value && styles.typeBtnActive]}
                  onPress={() => setCustomerType(type.value)}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      customerType === type.value && styles.typeBtnTextActive
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <AppTextInput
              label="City"
              placeholder="e.g. Hyderabad"
              value={city}
              onChangeText={setCity}
            />

            <AppTextInput
              label="Billing Address"
              placeholder="e.g. Plot 42, Jubilee Hills"
              value={billingAddress}
              onChangeText={setBillingAddress}
              multiline={true}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelBtn} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitText}>Save Customer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '85%',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: 14,
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2
  },
  closeBtn: {
    padding: 6
  },
  scroll: {
    paddingVertical: 6
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  typeBtnTextActive: {
    color: '#ffffff'
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 8
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.muted
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnDisabled: {
    opacity: 0.6
  },
  submitText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff'
  }
});

export default CreateCustomerModal;
