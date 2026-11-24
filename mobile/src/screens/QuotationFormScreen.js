import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, Plus, Trash2 } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { quotationService } from '../api/services';
import AppHeader from '../components/AppHeader';
import AppTextInput from '../components/AppTextInput';
import ContractorNoteScannerModal from '../components/ContractorNoteScannerModal';
import DetailSection from '../components/DetailSection';
import FormErrorBanner from '../components/FormErrorBanner';
import OfflineSyncBanner from '../components/OfflineSyncBanner';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import { colors } from '../theme/colors';
import { buildQuotationPayload, calculateLineTotal, calculateQuotationTotals } from '../utils/quotationTotals';
import { addDaysIso, formatMoney, todayIso } from '../utils/formatters';
import { offlineSyncManager } from '../utils/offlineSyncManager';

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
  const [showScannerModal, setShowScannerModal] = useState(false);
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

  const handleApplyOcrItems = (scannedItems, replaceMode) => {
    const formattedItems = scannedItems.map((item) => ({
      productId: item.matchedProductId,
      productName: item.matchedProductName,
      productSku: item.matchedProductSku || '',
      quantity: String(item.requestedQuantity || 1),
      unitPrice: String(item.unitPrice ?? 0),
      discountPercentage: '0',
      lineTotal: Number(item.unitPrice ?? 0) * (item.requestedQuantity || 1),
      notes: item.rawText ? `OCR: ${item.rawText}` : ''
    }));

    setForm((curr) => ({
      ...curr,
      items: replaceMode ? formattedItems : [...curr.items, ...formattedItems]
    }));
  };

  const handleSubmit = async () => {
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const isForced = await offlineSyncManager.isForcedOffline();
    if (isForced) {
      setSaving(true);
      setError('');
      try {
        const enqueued = await offlineSyncManager.enqueueQuotation(
          { ...form, ...totals },
          { customerName: form.customerName || customerName }
        );
        navigation.replace('OfflineSync', { highlightId: enqueued.localId });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      setSaving(true);
      setError('');
      const saved = await quotationService.create(buildQuotationPayload(form));
      navigation.replace('QuotationDetail', { id: saved.id });
    } catch (err) {
      const errMsg = getErrorMessage(err);
      const isNetworkIssue =
        !err.response ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        errMsg.toLowerCase().includes('network') ||
        errMsg.toLowerCase().includes('timeout') ||
        errMsg.toLowerCase().includes('connect');

      if (isNetworkIssue) {
        try {
          const enqueued = await offlineSyncManager.enqueueQuotation(
            { ...form, ...totals },
            { customerName: form.customerName || customerName }
          );
          navigation.replace('OfflineSync', { highlightId: enqueued.localId });
        } catch (enqueueErr) {
          setError(getErrorMessage(enqueueErr));
        }
      } else {
        setError(errMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader
        title="New Quotation"
        subtitle={customerName || 'Select Customer & Estimate'}
        onBack={() => navigation.goBack()}
      />
      <OfflineSyncBanner navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content}>
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
            <View style={styles.headerActions}>
              <Pressable style={styles.scanButton} onPress={() => setShowScannerModal(true)}>
                <Camera color={colors.white} size={14} />
                <Text style={styles.scanText}>OCR Scan</Text>
              </Pressable>
              <Pressable style={styles.addButton} onPress={() => navigation.navigate('ProductPicker')}>
                <Plus color={colors.primary} size={15} />
                <Text style={styles.addText}>Add Item</Text>
              </Pressable>
            </View>
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
                    <Trash2 color={colors.danger} size={16} />
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
            <Text style={styles.emptyText}>Add a product line or scan contractor notes to start the quotation.</Text>
          )}
        </DetailSection>

        <DetailSection title="Totals Breakdown">
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
          <View style={styles.totalRow}><Text style={styles.breakdownLabel}>Subtotal</Text><Text style={styles.breakdownVal}>{formatMoney(totals.subtotal)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.breakdownLabel}>Tax</Text><Text style={styles.breakdownVal}>{formatMoney(totals.taxAmount)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.breakdownLabel}>Discount</Text><Text style={styles.breakdownVal}>{formatMoney(totals.discount)}</Text></View>
          <View style={styles.grandRow}><Text style={styles.grandText}>Grand Total</Text><Text style={styles.grandText}>{formatMoney(totals.total)}</Text></View>
        </DetailSection>

        <DetailSection title="Notes & Terms">
          <AppTextInput
            label="Internal Notes"
            multiline
            value={form.notes}
            onChangeText={(notes) => setForm({ ...form, notes })}
          />
          <AppTextInput
            label="Terms & Conditions"
            multiline
            value={form.termsAndConditions}
            onChangeText={(termsAndConditions) => setForm({ ...form, termsAndConditions })}
          />
        </DetailSection>
      </ScrollView>
      <PrimaryActionBar label="Save Quotation" onPress={handleSubmit} loading={saving} disabled={saving} />
      <ContractorNoteScannerModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onApplyItems={handleApplyOcrItems}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 14,
    paddingBottom: 28
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  scanText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800'
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  addText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  itemCard: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 6
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
    fontSize: 14,
    fontWeight: '900'
  },
  itemSku: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  deleteButton: {
    padding: 6
  },
  itemGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  gridInput: {
    flex: 1
  },
  lineTotal: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'right'
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    paddingVertical: 8
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  breakdownLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  breakdownVal: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  grandRow: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8
  },
  grandText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900'
  }
});

export default QuotationFormScreen;
