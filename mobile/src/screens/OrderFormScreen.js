import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { ChevronDown, Minus, Plus, Trash2, User } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { customerService, orderService } from '../api/services';
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
      shipping,
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

  const adjustQuantity = (index, delta) => {
    setForm((current) => {
      const items = [...current.items];
      const currentQty = Math.max(1, (parseInt(items[index].quantity, 10) || 1) + delta);
      const nextItem = { ...items[index], quantity: String(currentQty) };
      nextItem.lineTotal = calculateLineTotal(nextItem);
      items[index] = nextItem;
      return { ...current, items };
    });
  };

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, i) => i !== index)
    }));
  };

  const handleSelectCustomer = (customer) => {
    setForm((curr) => ({
      ...curr,
      customerId: customer.id,
      customerName: customer.name,
      shippingAddress: curr.shippingAddress || customer.shippingAddress || customer.billingAddress || ''
    }));
    setShowCustomerPicker(false);
  };

  const handleSubmit = async () => {
    const validationError = validateOrder(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        customerId: form.customerId,
        customerName: form.customerName,
        orderDate: form.orderDate,
        deliveryDate: form.deliveryDate || null,
        status: form.status,
        paymentStatus: form.paymentStatus,
        taxPercentage: Number(form.taxPercentage) || 0,
        discount: Number(form.discount) || 0,
        shippingCharge: Number(form.shippingCharge) || 0,
        shippingAddress: form.shippingAddress ? form.shippingAddress.trim() : null,
        notes: form.notes ? form.notes.trim() : null,
        items: form.items.map((item) => ({
          productId: item.productId,
          quantity: parseInt(item.quantity, 10) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          discountPercentage: Number(item.discountPercentage) || 0,
          notes: item.notes ? item.notes.trim() : null
        }))
      };

      let saved;
      if (isEditing) {
        saved = await orderService.update(orderId, payload);
      } else {
        saved = await orderService.create(payload);
      }

      navigation.navigate('OrderDetail', { id: saved?.id || orderId, refreshedAt: Date.now() });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView label="Loading order details..." />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.screenTitle}>{isEditing ? 'Edit Order' : 'New Order'}</Text>
          <Text style={styles.screenSubtitle}>
            {isEditing ? 'Modify line items and order specifications' : 'Create direct customer fulfillment order'}
          </Text>
        </View>

        <FormErrorBanner message={error} />

        <DetailSection title="Customer Information">
          <TouchableOpacity
            style={styles.customerSelector}
            onPress={() => setShowCustomerPicker(true)}
            activeOpacity={0.8}
          >
            <View style={styles.customerSelectorInner}>
              <User size={18} color={form.customerName ? colors.primary : colors.muted} />
              <View style={styles.customerTextWrap}>
                <Text style={form.customerName ? styles.customerNameSelected : styles.customerPlaceholder}>
                  {form.customerName || 'Select Customer *'}
                </Text>
              </View>
              <ChevronDown size={18} color={colors.muted} />
            </View>
          </TouchableOpacity>
        </DetailSection>

        <DetailSection
          title="Line Items"
          action={
            <Pressable
              style={styles.addButton}
              onPress={() => navigation.navigate('ProductPicker', { targetScreen: 'OrderForm' })}
            >
              <Plus color={colors.primary} size={15} />
              <Text style={styles.addText}>Add Product</Text>
            </Pressable>
          }
        >
          {form.items.length ? (
            form.items.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                    {item.productSku ? <Text style={styles.itemSku}>SKU: {item.productSku}</Text> : null}
                  </View>
                  <Pressable
                    accessibilityLabel={`Remove ${item.productName}`}
                    onPress={() => removeItem(index)}
                    style={styles.removeBtn}
                  >
                    <Trash2 color={colors.danger || '#ef4444'} size={18} />
                  </Pressable>
                </View>

                <View style={styles.gridRow}>
                  {/* Quantity Stepper */}
                  <View style={styles.stepperContainer}>
                    <Text style={styles.stepperLabel}>Qty</Text>
                    <View style={styles.stepperWrap}>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => adjustQuantity(index, -1)}
                      >
                        <Minus size={14} color={colors.text} />
                      </Pressable>
                      <AppTextInput
                        style={styles.stepperInputWrap}
                        inputStyle={styles.stepperInput}
                        keyboardType="numeric"
                        value={String(item.quantity)}
                        onChangeText={(value) => updateItem(index, 'quantity', value)}
                      />
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => adjustQuantity(index, 1)}
                      >
                        <Plus size={14} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.gridInputWrap}>
                    <AppTextInput
                      label="Unit Price (₹)"
                      keyboardType="numeric"
                      value={String(item.unitPrice)}
                      onChangeText={(value) => updateItem(index, 'unitPrice', value)}
                      style={styles.gridInput}
                    />
                  </View>
                  <View style={styles.gridInputWrap}>
                    <AppTextInput
                      label="Disc %"
                      keyboardType="numeric"
                      value={String(item.discountPercentage)}
                      onChangeText={(value) => updateItem(index, 'discountPercentage', value)}
                      style={styles.gridInput}
                    />
                  </View>
                </View>

                <View style={styles.itemFooter}>
                  <Text style={styles.lineTotalLabel}>Item Total:</Text>
                  <Text style={styles.lineTotalValue}>{formatMoney(calculateLineTotal(item))}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyItemsText}>No products added. Tap "+ Add Product" above.</Text>
          )}
        </DetailSection>

        <DetailSection title="Delivery & Notes">
          <View style={styles.twoCol}>
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
            placeholder="Delivery address / site location"
            multiline
            value={form.shippingAddress}
            onChangeText={(val) => setForm({ ...form, shippingAddress: val })}
          />

          <AppTextInput
            label="Order Notes / Instructions"
            placeholder="Special packing or dispatch remarks"
            multiline
            value={form.notes}
            onChangeText={(val) => setForm({ ...form, notes: val })}
          />
        </DetailSection>

        <DetailSection title="Order Summary">
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <AppTextInput
                label="Tax / GST %"
                keyboardType="numeric"
                value={String(form.taxPercentage)}
                onChangeText={(taxPercentage) => setForm({ ...form, taxPercentage })}
              />
            </View>
            <View style={styles.col}>
              <AppTextInput
                label="Discount (₹)"
                keyboardType="numeric"
                value={String(form.discount)}
                onChangeText={(discount) => setForm({ ...form, discount })}
              />
            </View>
          </View>

          <AppTextInput
            label="Shipping Charges (₹)"
            keyboardType="numeric"
            value={String(form.shippingCharge)}
            onChangeText={(shippingCharge) => setForm({ ...form, shippingCharge })}
          />

          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatMoney(totals.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax Amount ({form.taxPercentage}%)</Text>
              <Text style={styles.summaryValue}>{formatMoney(totals.taxAmount)}</Text>
            </View>
            {totals.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Order Discount</Text>
                <Text style={styles.summaryDiscount}>-{formatMoney(totals.discount)}</Text>
              </View>
            )}
            {totals.shipping > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping / Freight</Text>
                <Text style={styles.summaryValue}>{formatMoney(totals.shipping)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatMoney(totals.grandTotal)}</Text>
            </View>
          </View>
        </DetailSection>
      </ScrollView>

      <PrimaryActionBar
        label={isEditing ? 'Update Order' : 'Create Order'}
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
              <Pressable onPress={() => setShowCustomerPicker(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {activeCustomers.map((cust) => (
                <TouchableOpacity
                  key={cust.id}
                  style={styles.modalItem}
                  onPress={() => handleSelectCustomer(cust)}
                >
                  <Text style={styles.modalItemName}>{cust.name}</Text>
                  <Text style={styles.modalItemSub}>
                    {[cust.company, cust.phoneNumber, cust.city].filter(Boolean).join(' • ')}
                  </Text>
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
  customerSelector: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12
  },
  customerSelectorInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  customerTextWrap: {
    flex: 1
  },
  customerNameSelected: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  customerPlaceholder: {
    color: colors.muted,
    fontSize: 15
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  addText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800'
  },
  itemCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  itemHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  itemInfo: {
    flex: 1,
    marginRight: 8
  },
  itemName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  itemSku: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  removeBtn: {
    padding: 4
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end'
  },
  stepperContainer: {
    flex: 1.2
  },
  stepperLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6
  },
  stepperWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 44,
    overflow: 'hidden'
  },
  stepperBtn: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    height: 44,
    justifyContent: 'center',
    width: 32
  },
  stepperInputWrap: {
    flex: 1,
    marginBottom: 0
  },
  stepperInput: {
    borderWidth: 0,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
    paddingVertical: 0,
    textAlign: 'center'
  },
  gridInputWrap: {
    flex: 1
  },
  gridInput: {
    marginBottom: 0
  },
  itemFooter: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8
  },
  lineTotalLabel: {
    color: colors.muted,
    fontSize: 12,
    marginRight: 6
  },
  lineTotalValue: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900'
  },
  emptyItemsText: {
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 12,
    textAlign: 'center'
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12
  },
  col: {
    flex: 1
  },
  summaryTable: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13
  },
  summaryValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600'
  },
  summaryDiscount: {
    color: colors.danger || '#ef4444',
    fontSize: 13,
    fontWeight: '700'
  },
  grandTotalRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8
  },
  grandTotalLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900'
  },
  grandTotalValue: {
    color: colors.primaryDark,
    fontSize: 17,
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
    fontSize: 17,
    fontWeight: '800'
  },
  modalClose: {
    color: colors.primary,
    fontWeight: '700'
  },
  modalList: {
    maxHeight: 380
  },
  modalItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: 12
  },
  modalItemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700'
  },
  modalItemSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  }
});

export default OrderFormScreen;
