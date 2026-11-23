import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getErrorMessage } from '../api/client';
import { customerService } from '../api/services';
import AppTextInput from '../components/AppTextInput';
import DetailSection from '../components/DetailSection';
import FormErrorBanner from '../components/FormErrorBanner';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import { LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import {
  CUSTOMER_TYPES,
  buildCustomerPayload,
  validateCustomerForm
} from '../utils/customerValidation';

const CustomerFormScreen = ({ route, navigation }) => {
  const customerId = route.params?.id;
  const isEditing = Boolean(customerId);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    alternatePhone: '',
    email: '',
    company: '',
    gstNumber: '',
    customerType: 'RETAIL',
    billingAddress: '',
    shippingAddress: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
    isActive: true
  });

  useEffect(() => {
    if (!customerId) return;
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await customerService.getById(customerId);
        if (isMounted && data) {
          setForm({
            name: data.name || '',
            phoneNumber: data.phoneNumber || '',
            alternatePhone: data.alternatePhone || '',
            email: data.email || '',
            company: data.company || '',
            gstNumber: data.gstNumber || '',
            customerType: data.customerType || 'RETAIL',
            billingAddress: data.billingAddress || '',
            shippingAddress: data.shippingAddress || '',
            city: data.city || '',
            state: data.state || '',
            pincode: data.pincode || '',
            notes: data.notes || '',
            isActive: data.isActive !== false
          });
        }
      } catch (err) {
        if (isMounted) setError(getErrorMessage(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [customerId]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  };

  const copyBillingToShipping = () => {
    updateField('shippingAddress', form.billingAddress);
  };

  const handleSave = async () => {
    const validation = validateCustomerForm(form);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      setError(firstError);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setFieldErrors({});
      const payload = buildCustomerPayload(form);

      let saved;
      if (isEditing) {
        saved = await customerService.update(customerId, payload);
      } else {
        saved = await customerService.create(payload);
      }

      const targetId = saved?.id || customerId;
      navigation.navigate('CustomerDetail', { id: targetId, refreshedAt: Date.now() });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView label="Loading customer details..." />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.screenTitle}>{isEditing ? 'Edit Customer' : 'New Customer'}</Text>
          <Text style={styles.screenSubtitle}>
            {isEditing ? 'Update profile, GSTIN, and address details' : 'Register a new customer or contractor profile'}
          </Text>
        </View>

        <FormErrorBanner message={error} />

        <DetailSection title="Basic Information">
          <AppTextInput
            label="Customer / Contact Name *"
            placeholder="e.g. Ramesh Patel"
            value={form.name}
            onChangeText={(val) => updateField('name', val)}
            style={fieldErrors.name && styles.inputErrorWrap}
          />
          {fieldErrors.name ? <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text> : null}

          <AppTextInput
            label="Phone Number *"
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            value={form.phoneNumber}
            onChangeText={(val) => updateField('phoneNumber', val)}
            style={fieldErrors.phoneNumber && styles.inputErrorWrap}
          />
          {fieldErrors.phoneNumber ? <Text style={styles.fieldErrorText}>{fieldErrors.phoneNumber}</Text> : null}

          <AppTextInput
            label="Alternate Phone"
            placeholder="Optional secondary contact"
            keyboardType="phone-pad"
            value={form.alternatePhone}
            onChangeText={(val) => updateField('alternatePhone', val)}
            style={fieldErrors.alternatePhone && styles.inputErrorWrap}
          />

          <AppTextInput
            label="Email Address"
            placeholder="name@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(val) => updateField('email', val)}
            style={fieldErrors.email && styles.inputErrorWrap}
          />
          {fieldErrors.email ? <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text> : null}

          <AppTextInput
            label="Company / Firm Name"
            placeholder="e.g. Patel Sanitary & Plumbing"
            value={form.company}
            onChangeText={(val) => updateField('company', val)}
          />

          <Text style={styles.fieldLabel}>Customer Type</Text>
          <View style={styles.typeRow}>
            {CUSTOMER_TYPES.map((type) => {
              const selected = form.customerType === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.typePill, selected && styles.typePillSelected]}
                  onPress={() => updateField('customerType', type)}
                >
                  <Text style={[styles.typePillText, selected && styles.typePillTextSelected]}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </DetailSection>

        <DetailSection title="GST & Taxation">
          <AppTextInput
            label="GSTIN"
            placeholder="15-digit GSTIN (e.g. 29ABCDE1234F1Z5)"
            autoCapitalize="characters"
            value={form.gstNumber}
            onChangeText={(val) => updateField('gstNumber', val.toUpperCase())}
            style={fieldErrors.gstNumber && styles.inputErrorWrap}
          />
          {fieldErrors.gstNumber ? <Text style={styles.fieldErrorText}>{fieldErrors.gstNumber}</Text> : null}
        </DetailSection>

        <DetailSection title="Location & Address">
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <AppTextInput
                label="City"
                placeholder="e.g. Bangalore"
                value={form.city}
                onChangeText={(val) => updateField('city', val)}
              />
            </View>
            <View style={styles.col}>
              <AppTextInput
                label="State"
                placeholder="e.g. Karnataka"
                value={form.state}
                onChangeText={(val) => updateField('state', val)}
              />
            </View>
          </View>

          <AppTextInput
            label="Pincode"
            placeholder="6-digit postal code"
            keyboardType="numeric"
            maxLength={6}
            value={form.pincode}
            onChangeText={(val) => updateField('pincode', val)}
            style={fieldErrors.pincode && styles.inputErrorWrap}
          />
          {fieldErrors.pincode ? <Text style={styles.fieldErrorText}>{fieldErrors.pincode}</Text> : null}

          <AppTextInput
            label="Billing Address"
            placeholder="Complete street address for invoices"
            multiline
            value={form.billingAddress}
            onChangeText={(val) => updateField('billingAddress', val)}
          />

          <View style={styles.addressActionRow}>
            <Text style={styles.fieldLabel}>Shipping Address</Text>
            {form.billingAddress ? (
              <Pressable onPress={copyBillingToShipping} style={styles.copyLink}>
                <Text style={styles.copyLinkText}>Same as billing</Text>
              </Pressable>
            ) : null}
          </View>
          <AppTextInput
            placeholder="Delivery site / warehouse address"
            multiline
            value={form.shippingAddress}
            onChangeText={(val) => updateField('shippingAddress', val)}
          />
        </DetailSection>

        <DetailSection title="Additional Notes">
          <AppTextInput
            label="Internal Notes"
            placeholder="Contractor discount preferences, site contacts..."
            multiline
            value={form.notes}
            onChangeText={(val) => updateField('notes', val)}
          />
        </DetailSection>
      </ScrollView>

      <PrimaryActionBar
        label={isEditing ? 'Save Changes' : 'Create Customer'}
        loading={saving}
        onPress={handleSave}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32
  },
  header: {
    marginBottom: 16
  },
  screenTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900'
  },
  screenSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  typePill: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  typePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  typePillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  typePillTextSelected: {
    color: '#ffffff'
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12
  },
  col: {
    flex: 1
  },
  addressActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  copyLink: {
    paddingVertical: 2
  },
  copyLinkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  inputErrorWrap: {
    borderColor: colors.danger || '#ef4444'
  },
  fieldErrorText: {
    color: colors.danger || '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 8
  }
});

export default CustomerFormScreen;
