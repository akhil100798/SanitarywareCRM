import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { ChevronDown, Plus, Trash2, User } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { customerService, orderService } from '../api/services';
import AppHeader from '../components/AppHeader';
import AppTextInput from '../components/AppTextInput';
import DetailSection from '../components/DetailSection';
import FormErrorBanner from '../components/FormErrorBanner';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import { LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { addDaysIso, formatMoney, todayIso } from '../utils/formatters';
import { calculateLineTotal, calculateQuotationTotals } from '../utils/quotationTotals';

const validateOrder = (form) => {
  if (!form.customerId) return 'Please select a customer for this order.';
  if (!form.items.length) return 'Add at least one product to the order.';

  const invalidItem = form.items.find((item) => {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    const disc = Number(item.discountPercentage);
    return (
      !item.productId ||
      !Number.isFinite(qty) ||
      qty < 1 ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(disc) ||
      disc < 0 ||
      disc > 100
    );
  });

  if (invalidItem) {
    return 'Ensure all items have valid quantities (>= 1), non-negative prices, and discounts (0-100%).';
  }

  return null;
};

const OrderFormScreen = ({ route, navigation }) => {
  const { customerId: initialCustomerId, customerName: initialCustomerName, selectedProduct, id: orderId } =
    route.params || {};

  const isEditing = Boolean(orderId);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [activeCustomers, setActiveCustomers] = useState([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  const [form, setForm] = useState({
    customerId: initialCustomerId || null,
    customerName: initialCustomerName || '',
    orderDate: todayIso(),
    deliveryDate: addDaysIso(3),
    status: 'PENDING',
    paymentStatus: 'PENDING',
    taxPercentage: '18',
    discount: '0',
    shippingCharge: '0',
    shippingAddress: '',
    notes: '',
    items: []
  });

  // Load existing order if editing
  useEffect(() => {
    if (!orderId) return;
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await orderService.getById(orderId);
        if (isMounted && data) {
          setForm({
            customerId: data.customerId,
            customerName: data.customerName || '',
            orderDate: data.orderDate || todayIso(),
            deliveryDate: data.deliveryDate || addDaysIso(3),
            status: data.status || 'PENDING',
            paymentStatus: data.paymentStatus || 'PENDING',
            taxPercentage: String(data.taxPercentage ?? '18'),
            discount: String(data.discount ?? '0'),
            shippingCharge: String(data.shippingCharge ?? '0'),
            shippingAddress: data.shippingAddress || '',
            notes: data.notes || '',
            items: (data.items || []).map((item) => ({
              productId: item.productId,
              productName: item.productName,
              productSku: item.productSku,
              quantity: String(item.quantity || 1),
              unitPrice: String(item.unitPrice ?? 0),
              discountPercentage: String(item.discountPercentage ?? 0),
              lineTotal: Number(item.lineTotal || (item.quantity * item.unitPrice)),
              notes: item.notes || ''
            }))
          });
        }
      } catch (err) {
        if (isMounted) setError(getErrorMessage(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [orderId]);

  // Load active customers for selector
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const custs = await customerService.getActive();
        if (isMounted) setActiveCustomers(custs || []);
      } catch {
        // Ignored
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Handle product picked from ProductPickerScreen
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

  const totals = useMemo(() => {
    const calculated = calculateQuotationTotals(form.items, form.taxPercentage, form.discount);
    const shipping = Number(form.shippingCharge) || 0;
    return {
      ...calculated,
      shippingCharge: shipping,
      grandTotal: calculated.total + shipping
    };
  }, [form.discount, form.items, form.shippingCharge, form.taxPercentage]);

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
      items: current.items.filter((_, idx) => idx !== index)
    }));
  };

  const handleSubmit = async () => {
    const validationErr = validateOrder(form);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        customerId: form.customerId,
        orderDate: form.orderDate,
        deliveryDate: form.deliveryDate,
        status: form.status,
        paymentStatus: form.paymentStatus,
        taxPercentage: Number(form.taxPercentage) || 0,
        discount: Number(form.discount) || 0,
        shippingCharge: Number(form.shippingCharge) || 0,
        shippingAddress: form.shippingAddress,
        notes: form.notes,
        items: form.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          productSku: it.productSku,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          discountPercentage: Number(it.discountPercentage) || 0,
          notes: it.notes || ''
        }))
      };

      let result;
      if (isEditing) {
        result = await orderService.update(orderId, payload);
      } else {
        result = await orderService.create(payload);
      }

      const targetId = result?.id || orderId;
      navigation.replace('OrderDetail', { id: targetId, refreshKey: Date.now() });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView label="Loading order details..." />;

  return (
    <Screen padded={false}>
      <AppHeader
        title={isEditing ? 'Edit Order' : 'New Order'}
        subtitle={form.customerName || 'Select Customer & Configure'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormErrorBanner message={error} />

        {/* Customer Selector Card */}
        <DetailSection title="Customer Information">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Select customer"
            style={styles.customerSelector}
            onPress={() => setShowCustomerPicker(true)}
          >
            <View style={styles.customerSelectorLeft}>
              <View style={styles.customerIconWrap}>
                <User color={colors.primary} size={18} />
              </View>
              <View>
                <Text style={styles.customerLabel}>Customer</Text>
                <Text style={styles.customerName}>
                  {form.customerName || 'Tap to select customer *'}
                </Text>
              </View>
            </View>
            <ChevronDown color={colors.muted} size={18} />
          </TouchableOpacity>
        </DetailSection>

        {/* Schedule & Dates */}
        <DetailSection title="Schedule & Dates">
          <View style={styles.row}>
            <View style={styles.col}>
              <AppTextInput
                label="Order Date"
                value={form.orderDate}
                onChangeText={(val) => setForm({ ...form, orderDate: val })}
              />
            </View>
            <View style={styles.col}>
              <AppTextInput
                label="Delivery Date"
                value={form.deliveryDate}
                onChangeText={(val) => setForm({ ...form, deliveryDate: val })}
              />
            </View>
          </View>
          <AppTextInput
            label="Shipping Address"
            placeholder="Delivery site or showroom address"
            multiline
            value={form.shippingAddress}
            onChangeText={(val) => setForm({ ...form, shippingAddress: val })}
          />
        </DetailSection>

        {/* Line Items */}
        <DetailSection
          title={`Order Items (${form.items.length})`}
          action={
            <TouchableOpacity
              onPress={() => navigation.navigate('ProductPicker', { targetScreen: 'OrderForm' })}
              style={styles.addItemBtn}
            >
              <Plus size={14} color={colors.primary} />
              <Text style={styles.addItemBtnText}>Add Product</Text>
            </TouchableOpacity>
          }
        >
          {form.items.length ? (
            form.items.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.productName}</Text>
                    <Text style={styles.itemSku}>{item.productSku || 'No SKU'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                <View style={styles.itemGrid}>
                  <View style={styles.col}>
                    <AppTextInput
                      label="Qty"
                      keyboardType="numeric"
                      value={String(item.quantity)}
                      onChangeText={(val) => updateItem(index, 'quantity', val)}
                    />
                  </View>
                  <View style={styles.col}>
                    <AppTextInput
                      label="Unit Price"
                      keyboardType="numeric"
                      value={String(item.unitPrice)}
                      onChangeText={(val) => updateItem(index, 'unitPrice', val)}
                    />
                  </View>
                  <View style={styles.col}>
                    <AppTextInput
                      label="Disc %"
                      keyboardType="numeric"
                      value={String(item.discountPercentage)}
                      onChangeText={(val) => updateItem(index, 'discountPercentage', val)}
                    />
                  </View>
                </View>

                <Text style={styles.lineTotal}>
                  Line Total: {formatMoney(calculateLineTotal(item))}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyItemsText}>
              No items added yet. Tap "Add Product" above to browse the showroom catalog.
            </Text>
          )}
        </DetailSection>

        {/* Pricing & Adjustments */}
        <DetailSection title="Pricing & Adjustments">
          <View style={styles.row}>
            <View style={styles.col}>
              <AppTextInput
                label="Tax / GST %"
                keyboardType="numeric"
                value={form.taxPercentage}
                onChangeText={(val) => setForm({ ...form, taxPercentage: val })}
              />
            </View>
            <View style={styles.col}>
              <AppTextInput
                label="Discount"
                keyboardType="numeric"
                value={form.discount}
                onChangeText={(val) => setForm({ ...form, discount: val })}
              />
            </View>
          </View>
          <AppTextInput
            label="Shipping / Delivery Charge"
            keyboardType="numeric"
            value={form.shippingCharge}
            onChangeText={(val) => setForm({ ...form, shippingCharge: val })}
          />

          <View style={styles.calcRow}><Text style={styles.calcLabel}>Subtotal</Text><Text style={styles.calcVal}>{formatMoney(totals.subtotal)}</Text></View>
          <View style={styles.calcRow}><Text style={styles.calcLabel}>Tax</Text><Text style={styles.calcVal}>{formatMoney(totals.taxAmount)}</Text></View>
          <View style={styles.calcRow}><Text style={styles.calcLabel}>Discount</Text><Text style={styles.calcVal}>{formatMoney(totals.discount)}</Text></View>
          {totals.shippingCharge > 0 ? (
            <View style={styles.calcRow}><Text style={styles.calcLabel}>Shipping</Text><Text style={styles.calcVal}>{formatMoney(totals.shippingCharge)}</Text></View>
          ) : null}
          <View style={styles.grandRow}><Text style={styles.grandText}>Grand Total</Text><Text style={styles.grandText}>{formatMoney(totals.grandTotal)}</Text></View>
        </DetailSection>

        {/* Notes */}
        <DetailSection title="Order Notes">
          <AppTextInput
            label="Internal Notes"
            placeholder="Delivery instructions, site gate code..."
            multiline
            value={form.notes}
            onChangeText={(val) => setForm({ ...form, notes: val })}
          />
        </DetailSection>
      </ScrollView>

      <PrimaryActionBar
        label={isEditing ? 'Save Changes' : 'Create Order'}
        loading={saving}
        disabled={saving}
        onPress={handleSubmit}
      />

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {activeCustomers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setForm({ ...form, customerId: c.id, customerName: c.name });
                    setShowCustomerPicker(false);
                  }}
                >
                  <Text style={styles.modalItemName}>{c.name}</Text>
                  <Text style={styles.modalItemSub}>{c.phoneNumber} • {c.company || c.city || 'Retail'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 14,
    paddingBottom: 28
  },
  customerSelector: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10
  },
  customerSelectorLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  customerIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    borderRadius: 6,
    height: 32,
    justifyContent: 'center',
    width: 32
  },
  customerLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  customerName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  col: {
    flex: 1
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  addItemBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  itemCard: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 6
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  itemTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  itemSku: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  removeBtn: {
    padding: 4
  },
  itemGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  lineTotal: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: 4
  },
  emptyItemsText: {
    color: colors.muted,
    fontSize: 12,
    paddingVertical: 10
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  calcLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  calcVal: {
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
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
    padding: 16
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  modalClose: {
    color: colors.primary,
    fontWeight: '800'
  },
  modalList: {
    maxHeight: 380
  },
  modalItem: {
    borderBottomColor: colors.borderLight,
    borderBottomWidth: 1,
    paddingVertical: 10
  },
  modalItemName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  modalItemSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  }
});

export default OrderFormScreen;
