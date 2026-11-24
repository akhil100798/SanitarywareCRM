import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getErrorMessage } from '../api/client';
import { paymentService, orderService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { createPaymentIntentStore, paymentErrorMessage } from '../utils/paymentIntent';
import AppHeader from '../components/AppHeader';
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
  { label: 'Bank Transfer (NEFT/RTGS)', value: 'BANK_TRANSFER' },
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
  const { user } = useAuth();
  const intentScope = `customer:${user?.id}:${orderId}`;
  const intents = useRef(createPaymentIntentStore(AsyncStorage)).current;
  const submitting = useRef(false);
  const [restoring, setRestoring] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(balanceAmount);
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

  useEffect(() => {
    let active = true;
    setRestoring(true);
    intents.read(intentScope).then(pending => {
      if (active && pending) {
        setForm(prev => ({ ...prev, ...pending.payload, amount: String(pending.payload.amount) }));
        setError('An earlier payment attempt is pending. Retry its original details to confirm its result.');
      }
    }).catch(err => { if (active) setError(getErrorMessage(err)); })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, [intentScope, intents]);

  const submitPayment = async () => {
    if (submitting.current || restoring) return;
    submitting.current = true;
    try {
      setSaving(true);
      setError('');
      const pending = await intents.read(intentScope);
      const validationError = validatePayment(form, pending ? undefined : currentBalance);
      if (validationError) { setError(validationError); return; }
      const payload = {
        ...form,
        amount: Number(form.amount)
      };
      const key = await intents.prepare(intentScope, payload);
      await paymentService.create(payload, key);
      await intents.complete(intentScope);
      navigation.navigate(
        'OrderDetail',
        { id: orderId, refreshKey: Date.now() },
        { merge: true, pop: true }
      );
    } catch (err) {
      try { await intents.failed(intentScope, err); } catch { /* Preserve the original actionable error. */ }
      setError(paymentErrorMessage(err));
      if ([400, 409].includes(err.response?.status)) {
        try { setCurrentBalance((await orderService.getById(orderId)).balanceAmount); } catch { /* Preserve the original intent. */ }
      }
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader
        title="Record Payment"
        subtitle={orderNumber ? `Order #${orderNumber}` : orderId ? `Order #${orderId}` : 'Customer Payment Entry'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <FormErrorBanner message={error} />

        {currentBalance !== undefined && (
          <DetailSection title="Order Balance">
            <View style={styles.balanceBox}>
              <Text style={styles.balanceLabel}>Outstanding Balance Due</Text>
              <Text style={styles.balanceValue}>{formatMoney(currentBalance)}</Text>
            </View>
          </DetailSection>
        )}

        <DetailSection title="Payment Details">
          <AppTextInput
            label="Payment Amount *"
            placeholder="INR 0.00"
            keyboardType="numeric"
            value={String(form.amount)}
            onChangeText={(amount) => setForm({ ...form, amount })}
          />
          <AppTextInput
            label="Payment Date *"
            value={form.paymentDate}
            onChangeText={(paymentDate) => setForm({ ...form, paymentDate })}
          />
          <AppSelect
            label="Payment Mode *"
            options={paymentMethods}
            value={form.paymentMethod}
            onChange={(paymentMethod) => setForm({ ...form, paymentMethod })}
          />
          <AppTextInput
            label="UTR / Reference Number"
            placeholder="Bank UTR, Cheque No., or UPI Transaction ID"
            value={form.referenceNumber}
            onChangeText={(referenceNumber) => setForm({ ...form, referenceNumber })}
          />
          <AppTextInput
            label="Internal Notes"
            placeholder="Payer details, bank name, branch..."
            multiline
            value={form.notes}
            onChangeText={(notes) => setForm({ ...form, notes })}
          />
        </DetailSection>
      </ScrollView>
      <PrimaryActionBar
        label="Record Payment"
        onPress={submitPayment}
        loading={saving || restoring}
        disabled={saving || restoring}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 14,
    paddingBottom: 28
  },
  balanceBox: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center'
  },
  balanceLabel: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  balanceValue: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4
  }
});

export default PaymentFormScreen;
