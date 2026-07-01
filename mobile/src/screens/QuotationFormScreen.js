import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { quotationService } from '../api/services';
import AppTextInput from '../components/AppTextInput';
import DetailSection from '../components/DetailSection';
import FormErrorBanner from '../components/FormErrorBanner';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import { colors } from '../theme/colors';
import { buildQuotationPayload, calculateLineTotal, calculateQuotationTotals } from '../utils/quotationTotals';
import { addDaysIso, formatMoney, todayIso } from '../utils/formatters';

const defaultTerms = '1. Quotation valid for 7 days.\n2. 50% advance for orders.\n3. Delivery within 3-5 days of order confirmation.';

const validateForm = (form) => {
  if (!form.items.length) return 'Add at least one product line.';
  const invalidItem = form.items.find((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const discountPercentage = Number(item.discountPercentage);
    return (
      !item.productId ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !Number.isFinite(discountPercentage) ||
      discountPercentage < 0 ||
      discountPercentage > 100
    );
  });
  return invalidItem ? 'Check product, quantity, unit price, and discount on every line.' : '';
};

const QuotationFormScreen = ({ route, navigation }) => {
  const { customerId, customerName, selectedProduct } = route.params || {};
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customerId,
    customerName,
    quotationDate: todayIso(),
    validUntil: addDaysIso(7),
    taxPercentage: '18',
    discount: '0',
    notes: '',
    termsAndConditions: defaultTerms,
    items: []
  });

  useEffect(() => {
    if (!selectedProduct) return;
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productSku: selectedProduct.sku,
          quantity: '1',
          unitPrice: String(selectedProduct.sellingPrice ?? 0),
          discountPercentage: '0',
          lineTotal: Number(selectedProduct.sellingPrice ?? 0),
          notes: ''
        }
      ]
    }));
    navigation.setParams({ selectedProduct: undefined });
  }, [navigation, selectedProduct]);

  const totals = useMemo(
    () => calculateQuotationTotals(form.items, form.taxPercentage, form.discount),
    [form.discount, form.items, form.taxPercentage]
  );

  const updateItem = (index, field, value) => {
    setForm((current) => {
      const items = [...current.items];
      const nextItem = { ...items[index], [field]: value };
      nextItem.lineTotal = calculateLineTotal(nextItem);
      items[index] = nextItem;
      return { ...current, items };
    });
  };

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const handleSubmit = async () => {
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');
      const saved = await quotationService.create(buildQuotationPayload(form));
      navigation.replace('QuotationDetail', { id: saved.id });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>New Quotation</Text>
        <Text style={styles.subtitle}>{customerName}</Text>
        <FormErrorBanner message={error} />

        <DetailSection title="Quote Info">
          <AppTextInput
            label="Quotation Date"
            value={form.quotationDate}
            onChangeText={(quotationDate) => setForm({ ...form, quotationDate })}
          />
          <AppTextInput
            label="Valid Until"
            value={form.validUntil}
            onChangeText={(validUntil) => setForm({ ...form, validUntil })}
          />
        </DetailSection>

        <DetailSection
          title="Line Items"
          action={
            <Pressable style={styles.addButton} onPress={() => navigation.navigate('ProductPicker')}>
              <Plus color={colors.primary} size={16} />
              <Text style={styles.addText}>Product</Text>
            </Pressable>
          }
        >
          {form.items.length ? (
            form.items.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleWrap}>
                    <Text style={styles.itemTitle}>{item.productName}</Text>
                    <Text style={styles.itemSku}>{item.productSku || 'No SKU'}</Text>
                  </View>
                  <Pressable onPress={() => removeItem(index)} style={styles.deleteButton}>
                    <Trash2 color={colors.danger} size={18} />
                  </Pressable>
                </View>
                <View style={styles.itemGrid}>
                  <AppTextInput
                    label="Qty"
                    keyboardType="numeric"
                    value={String(item.quantity)}
                    onChangeText={(value) => updateItem(index, 'quantity', value)}
                    style={styles.gridInput}
                  />
                  <AppTextInput
                    label="Unit Price"
                    keyboardType="numeric"
                    value={String(item.unitPrice)}
                    onChangeText={(value) => updateItem(index, 'unitPrice', value)}
                    style={styles.gridInput}
                  />
                  <AppTextInput
                    label="Disc %"
                    keyboardType="numeric"
                    value={String(item.discountPercentage)}
                    onChangeText={(value) => updateItem(index, 'discountPercentage', value)}
                    style={styles.gridInput}
                  />
                </View>
                <AppTextInput
                  label="Line Notes"
                  value={item.notes}
                  onChangeText={(value) => updateItem(index, 'notes', value)}
                />
                <Text style={styles.lineTotal}>Line Total: {formatMoney(calculateLineTotal(item))}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Add a product line to start the quotation.</Text>
          )}
        </DetailSection>

        <DetailSection title="Totals">
          <AppTextInput
            label="Tax / GST %"
            keyboardType="numeric"
            value={String(form.taxPercentage)}
            onChangeText={(taxPercentage) => setForm({ ...form, taxPercentage })}
          />
          <AppTextInput
            label="Total Discount"
            keyboardType="numeric"
            value={String(form.discount)}
            onChangeText={(discount) => setForm({ ...form, discount })}
          />
          <View style={styles.totalRow}><Text>Subtotal</Text><Text>{formatMoney(totals.subtotal)}</Text></View>
          <View style={styles.totalRow}><Text>Tax</Text><Text>{formatMoney(totals.taxAmount)}</Text></View>
          <View style={styles.totalRow}><Text>Discount</Text><Text>{formatMoney(totals.discount)}</Text></View>
          <View style={styles.grandRow}><Text style={styles.grandText}>Grand Total</Text><Text style={styles.grandText}>{formatMoney(totals.total)}</Text></View>
        </DetailSection>

        <DetailSection title="Notes">
          <AppTextInput
            label="Notes"
            multiline
            value={form.notes}
            onChangeText={(notes) => setForm({ ...form, notes })}
          />
          <AppTextInput
            label="Terms"
            multiline
            value={form.termsAndConditions}
            onChangeText={(termsAndConditions) => setForm({ ...form, termsAndConditions })}
          />
        </DetailSection>
      </ScrollView>
      <PrimaryActionBar label="Save Quotation" onPress={handleSubmit} loading={saving} disabled={saving} />
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
  addButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4
  },
  addText: {
    color: colors.primary,
    fontWeight: '900'
  },
  itemCard: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 12
  },
  itemHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  itemTitleWrap: {
    flex: 1
  },
  itemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900'
  },
  itemSku: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  deleteButton: {
    padding: 8
  },
  itemGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  gridInput: {
    flex: 1
  },
  lineTotal: {
    color: colors.primaryDark,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'right'
  },
  emptyText: {
    color: colors.muted,
    paddingVertical: 8
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7
  },
  grandRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 10
  },
  grandText: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: '900'
  }
});

export default QuotationFormScreen;
