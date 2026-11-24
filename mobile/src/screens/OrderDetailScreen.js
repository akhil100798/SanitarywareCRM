import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Download, FileText, CheckCircle2, MessageSquare, Plus } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { orderService, paymentService } from '../api/services';
import AppHeader from '../components/AppHeader';
import DetailSection from '../components/DetailSection';
import FieldRow from '../components/FieldRow';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { formatDate, formatMoney } from '../utils/formatters';

const OrderDetailScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const canAccessPayments = ['ADMIN', 'MANAGER', 'SALES'].includes(user?.role);
  const orderId = route.params?.id;
  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingReceiptId, setSendingReceiptId] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [invoiceDownloaded, setInvoiceDownloaded] = useState(false);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    try {
      setError('');
      const [orderData, paymentData] = await Promise.all([
        orderService.getById(orderId),
        canAccessPayments ? paymentService.getByOrder(orderId) : Promise.resolve([])
      ]);
      setOrder(orderData);
      setPayments(paymentData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, canAccessPayments]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder])
  );

  const handleSendPaymentReceipt = async (paymentId) => {
    try {
      setSendingReceiptId(paymentId);
      const res = await paymentService.sendWhatsApp(paymentId);
      Alert.alert(
        res.status === 'SENT' ? 'Receipt Sent' : 'WhatsApp Notification',
        res.detail || 'Payment receipt dispatched to customer via WhatsApp.'
      );
    } catch (err) {
      Alert.alert('WhatsApp Error', getErrorMessage(err));
    } finally {
      setSendingReceiptId(null);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      setDownloadingInvoice(true);
      const fileInfo = await orderService.downloadInvoice(orderId);
      setInvoiceDownloaded(true);
      Alert.alert(
        'Invoice Downloaded',
        `Official tax invoice ${fileInfo?.fileName || `invoice-${orderId}.pdf`} has been downloaded successfully to device storage.`
      );
    } catch (err) {
      Alert.alert('Download Error', getErrorMessage(err));
    } finally {
      setDownloadingInvoice(false);
    }
  };

  if (loading) return <LoadingView label="Loading order..." />;
  if (error) return <ErrorView message={error} onRetry={loadOrder} />;

  return (
    <Screen padded={false}>
      <AppHeader
        title={order.orderNumber || `Order #${order.id}`}
        subtitle={order.customerName}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadOrder();
            }}
          />
        }
      >
        {/* Order Header Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.orderTitle}>{order.orderNumber || `Order #${order.id}`}</Text>
              <Text style={styles.customerName}>{order.customerName}</Text>
            </View>
            <View style={styles.statusPillsRow}>
              <StatusPill status={order.status} size="sm" />
              <StatusPill status={order.paymentStatus} size="sm" />
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Order Amount</Text>
            <Text style={styles.totalAmount}>{formatMoney(order.total)}</Text>
          </View>
        </View>

        {/* Invoice & Billing Documents Card */}
        <DetailSection title="Tax Invoice & Documents">
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceIconBox}>
                <FileText color={colors.primary} size={22} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.invoiceTitle}>
                  {order.orderNumber ? `Invoice #${order.orderNumber}` : `Invoice #${order.id}`}
                </Text>
                <Text style={styles.invoiceSubtitle}>
                  GST Compliant B2B/B2C Tax Invoice
                </Text>
              </View>
              {invoiceDownloaded && (
                <View style={styles.downloadedBadge}>
                  <CheckCircle2 color={colors.success} size={14} />
                  <Text style={styles.downloadedText}>Saved</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Download Invoice PDF"
              style={[styles.invoiceButton, downloadingInvoice && styles.invoiceButtonDisabled]}
              onPress={handleDownloadInvoice}
              disabled={downloadingInvoice}
              activeOpacity={0.8}
            >
              {downloadingInvoice ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Download color={colors.white} size={15} />
                  <Text style={styles.invoiceButtonText}>
                    {invoiceDownloaded ? 'Re-Download Invoice (PDF)' : 'Download Invoice (PDF)'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </DetailSection>

        <DetailSection title="Order Details">
          <FieldRow label="Customer" value={order.customerName} />
          <FieldRow label="Order Date" value={formatDate(order.orderDate)} />
          <FieldRow label="Delivery Date" value={formatDate(order.deliveryDate)} />
          <FieldRow label="Shipping Address" value={order.shippingAddress || 'Showroom Pickup'} />
          <FieldRow label="Fulfillment Status" value={order.status} />
          <FieldRow label="Payment Status" value={order.paymentStatus} />
        </DetailSection>

        <DetailSection title="Cart Items">
          {(order.items || []).map((item) => (
            <View key={item.id || `${item.productId}-${item.productName}`} style={styles.itemRow}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemTotal}>{formatMoney(item.lineTotal)}</Text>
              </View>
              <Text style={styles.itemMeta}>
                QTY: {item.quantity} x {formatMoney(item.unitPrice)} | Disc: {item.discountPercentage || 0}%
              </Text>
            </View>
          ))}
        </DetailSection>

        {/* Payments Section */}
        {canAccessPayments && (
          <DetailSection
            title={`Customer Payments (${payments.length})`}
            action={
              <TouchableOpacity
                onPress={() => navigation.navigate('PaymentForm', { orderId: order.id, customerName: order.customerName })}
                style={styles.addPaymentBtn}
              >
                <Plus size={14} color={colors.primary} />
                <Text style={styles.addPaymentText}>Add</Text>
              </TouchableOpacity>
            }
          >
            {payments.length ? (
              payments.map((p) => (
                <View key={p.id} style={styles.paymentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentMethod}>{p.paymentMethod} Payment</Text>
                    <Text style={styles.paymentMeta}>
                      {formatDate(p.paymentDate)} • {p.transactionReference || 'Direct settlement'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.paymentAmount}>{formatMoney(p.amount)}</Text>
                    <TouchableOpacity
                      onPress={() => handleSendPaymentReceipt(p.id)}
                      disabled={sendingReceiptId === p.id}
                      style={styles.receiptBtn}
                    >
                      <MessageSquare size={12} color={colors.primary} />
                      <Text style={styles.receiptBtnText}>Receipt</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <EmptyView title="No payments recorded" message="Collect an advance or payment for this order." />
            )}
          </DetailSection>
        )}

        <DetailSection title="Price Breakdown">
          <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Subtotal</Text><Text style={styles.breakdownVal}>{formatMoney(order.subtotal)}</Text></View>
          <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Tax</Text><Text style={styles.breakdownVal}>{formatMoney(order.taxAmount)}</Text></View>
          <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Discount</Text><Text style={styles.breakdownVal}>{formatMoney(order.discount)}</Text></View>
          {Number(order.shippingCharge || 0) > 0 ? (
            <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Shipping / Freight</Text><Text style={styles.breakdownVal}>{formatMoney(order.shippingCharge)}</Text></View>
          ) : null}
          <View style={styles.grandRow}><Text style={styles.grandText}>Total</Text><Text style={styles.grandText}>{formatMoney(order.total)}</Text></View>
        </DetailSection>
      </ScrollView>

      {canAccessPayments && (
        <PrimaryActionBar
          label="Record Payment"
          onPress={() =>
            navigation.navigate('PaymentForm', {
              orderId: order.id,
              customerName: order.customerName,
              total: order.total
            })
          }
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 14,
    paddingBottom: 28
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  orderTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  customerName: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  statusPillsRow: {
    alignItems: 'flex-end',
    gap: 4
  },
  totalRow: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10
  },
  totalLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  totalAmount: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4
  },
  invoiceCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12
  },
  invoiceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10
  },
  invoiceIconBox: {
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  invoiceTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  invoiceSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  downloadedBadge: {
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  downloadedText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800'
  },
  invoiceButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    paddingVertical: 10
  },
  invoiceButtonDisabled: {
    opacity: 0.6
  },
  invoiceButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800'
  },
  itemRow: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingVertical: 8
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  itemName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    flex: 1
  },
  itemTotal: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 8
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  addPaymentText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingVertical: 8
  },
  paymentMethod: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  paymentMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  paymentAmount: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900'
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  receiptBtnText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700'
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5
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

export default OrderDetailScreen;
