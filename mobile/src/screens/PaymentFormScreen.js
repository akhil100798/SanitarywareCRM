import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getErrorMessage } from '../api/client';
import { paymentService } from '../api/services';
import AppSelect from '../components/AppSelect';
import AppTextInput from '../components/AppTextInput';
import DetailSection from '../components/DetailSection';
import FormErrorBanner from '../components/FormErrorBanner';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import { colors } from '../theme/colors';
import { formatMoney, todayIso } from '../utils/formatters';

const paymentMethods = [
  { label: 'Cash', value: 'CASH' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank', value: 'BANK_TRANSFER' },
  { label: 'Cheque', value: 'CHEQUE' },
  { label: 'Credit Card', value: 'CREDIT_CARD' },
  { label: 'Debit Card', value: 'DEBIT_CARD' }
];

const validatePayment = (form, balanceAmount) => {
  const amount = Number(form.amount);
  const balance = Number(balanceAmount);
  if (!Number.isFinite(amount) || amount <= 0) return 'Amount must be greater than 0.';
  if (Number.isFinite(balance) && amount > balance) {
    return `Amount cannot exceed balance ${formatMoney(balance)}.`;
  }
  if (!form.paymentMethod) return 'Payment method is required.';
  return '';
};

const PaymentFormScreen = ({ route, navigation }) => {
  const { orderId, orderNumber, balanceAmount } = route.params || {};
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    orderId,
    paymentDate: todayIso(),
    amount: String(balanceAmount || ''),
    paymentMethod: 'CASH',
    referenceNumber: '',
    notes: ''
  });

  const submitPayment = async () => {
    const validationError = validatePayment(form, balanceAmount);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');
      await paymentService.create({
        ...form,
        amount: Number(form.amount)
      });
      navigation.navigate('OrderDetail', { id: orderId, refreshKey: Date.now() });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Record Payment</Text>
        <Text style={styles.subtitle}>{orderNumber || `Order #${orderId}`}</Text>
        <FormErrorBanner message={error} />

        <DetailSection title="Order Balance">
          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>Balance Due</Text>
            <Text style={styles.balanceValue}>{formatMoney(balanceAmount)}</Text>
          </View>
        </DetailSection>

        <DetailSection title="Payment Details">
          <AppTextInput
            label="Amount"
            keyboardType="numeric"
            value={String(form.amount)}
            onChangeText={(amount) => setForm({ ...form, amount })}
          />
          <AppTextInput
            label="Payment Date"
            value={form.paymentDate}
            onChangeText={(paymentDate) => setForm({ ...form, paymentDate })}
          />
          <AppSelect
            label="Payment Method"
            options={paymentMethods}
            value={form.paymentMethod}
            onChange={(paymentMethod) => setForm({ ...form, paymentMethod })}
          />
          <AppTextInput
            label="Reference Number"
            value={form.referenceNumber}
            onChangeText={(referenceNumber) => setForm({ ...form, referenceNumber })}
          />
          <AppTextInput
            label="Notes"
            multiline
            value={form.notes}
            onChangeText={(notes) => setForm({ ...form, notes })}
          />
        </DetailSection>
      </ScrollView>
      <PrimaryActionBar label="Record Payment" onPress={submitPayment} loading={saving} disabled={saving} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 14,
    marginTop: 4
  },
  balanceBox: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 16
  },
  balanceLabel: {
    color: colors.primaryDark,
    fontWeight: '800'
  },
  balanceValue: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4
  }
});

export default PaymentFormScreen;
