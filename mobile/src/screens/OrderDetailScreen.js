import React, { useCallback, useEffect, useState } from 'react';
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
import { Download, FileText, CheckCircle2 } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { orderService, paymentService } from '../api/services';
import DetailSection from '../components/DetailSection';
import FieldRow from '../components/FieldRow';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { formatDate, formatMoney } from '../utils/formatters';

const OrderDetailScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const canAccessPayments = ['ADMIN', 'MANAGER', 'SALES'].includes(user?.role);
  const orderId = route.params?.id;
  const refreshKey = route.params?.refreshKey;
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

  useEffect(() => {
    loadOrder();
  }, [loadOrder, refreshKey]);

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
        <Text style={styles.title}>{order.orderNumber || `Order #${order.id}`}</Text>
        <Text style={styles.subtitle}>{order.customerName}</Text>

        {/* Invoice & Billing Documents Card */}
        <DetailSection title="Invoice & Billing Documents">
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceIconBox}>
                <FileText color={colors.primary} size={24} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.invoiceTitle}>
                  {order.orderNumber ? `Invoice #${order.orderNumber}` : `Invoice #${order.id}`}
                </Text>
                <Text style={styles.invoiceSubtitle}>
                  GST Tax Invoice • Total: {formatMoney(order.total)}
                </Text>
              </View>
              {invoiceDownloaded && (
                <View style={styles.downloadedBadge}>
                  <CheckCircle2 color="#047857" size={14} />
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
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Download color="#ffffff" size={16} />
                  <Text style={styles.invoiceButtonText}>
                    {invoiceDownloaded ? 'Re-Download Invoice (PDF)' : 'Download Invoice (PDF)'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </DetailSection>

        <DetailSection title="Order Summary">
          <FieldRow label="Customer" value={order.customerName} />
          <FieldRow label="Order Date" value={formatDate(order.orderDate)} />
          <FieldRow label="Order Status" value={order.status} />
          {canAccessPayments && <FieldRow label="Payment Status" value={order.paymentStatus} />}
        </DetailSection>

        <DetailSection title="Line Items">
          {(order.items || []).map((item) => (
            <View key={item.id || `${item.productId}-${item.productName}`} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} x {formatMoney(item.unitPrice)} | Disc {item.discountPercentage || 0}%
              </Text>
              <Text style={styles.itemTotal}>{formatMoney(item.lineTotal)}</Text>
            </View>
          ))}
        </DetailSection>

        {canAccessPayments && <DetailSection title="Payment Summary">
          <View style={styles.totalRow}><Text>Subtotal</Text><Text>{formatMoney(order.subtotal)}</Text></View>
          <View style={styles.totalRow}><Text>Total</Text><Text>{formatMoney(order.total)}</Text></View>
          <View style={styles.totalRow}><Text>Paid</Text><Text>{formatMoney(order.paidAmount)}</Text></View>
          <View style={styles.grandRow}><Text style={styles.grandText}>Balance</Text><Text style={styles.grandText}>{formatMoney(order.balanceAmount)}</Text></View>
        </DetailSection>}

        {canAccessPayments && <DetailSection title="Payment History">
          {payments.length ? (
            payments.map((payment) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>{payment.paymentNumber || `Payment #${payment.id}`}</Text>
                  <Text style={styles.paymentMeta}>
                    {formatDate(payment.paymentDate)} | {payment.paymentMethod}
                  </Text>
                  {payment.referenceNumber ? (
                    <Text style={styles.paymentRef}>Ref: {payment.referenceNumber}</Text>
                  ) : null}
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>{formatMoney(payment.amount)}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Send WhatsApp receipt for payment ${payment.paymentNumber || payment.id}`}
                    style={[styles.receiptButton, sendingReceiptId === payment.id && styles.receiptButtonDisabled]}
                    onPress={() => handleSendPaymentReceipt(payment.id)}
                    disabled={sendingReceiptId === payment.id}
                  >
                    {sendingReceiptId === payment.id ? (
                      <ActivityIndicator size="small" color="#16a34a" />
                    ) : (
                      <Text style={styles.receiptButtonText}>WhatsApp Receipt</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <EmptyView title="No payments recorded" message="Record a payment when the customer pays." />
          )}
        </DetailSection>}
      </ScrollView>
      <PrimaryActionBar
        label={canAccessPayments ? 'Record Payment' : 'Refresh'}
        secondaryLabel={canAccessPayments ? 'Refresh' : undefined}
        onSecondaryPress={() => {
          setRefreshing(true);
          loadOrder();
        }}
        onPress={() => {
          if (!canAccessPayments) {
            setRefreshing(true);
            loadOrder();
            return;
          }
          navigation.navigate('PaymentForm', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            balanceAmount: order.balanceAmount
          });
        }}
      />
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
  itemRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: 10
  },
  itemName: {
    color: colors.text,
    fontWeight: '900'
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  itemTotal: {
    color: colors.primaryDark,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'right'
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
  },
  paymentRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  paymentInfo: {
    flex: 1,
    marginRight: 8
  },
  paymentTitle: {
    color: colors.text,
    fontWeight: '900'
  },
  paymentMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  paymentRef: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  paymentAmount: {
    color: colors.success,
    fontWeight: '900'
  },
  receiptButton: {
    alignItems: 'center',
    borderColor: '#16a34a',
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 110,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  receiptButtonDisabled: {
    opacity: 0.6
  },
  receiptButtonText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '700'
  },
  invoiceCard: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14
  },
  invoiceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12
  },
  invoiceIconBox: {
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  invoiceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900'
  },
  invoiceSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  downloadedBadge: {
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  downloadedText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '800'
  },
  invoiceButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    paddingVertical: 12
  },
  invoiceButtonDisabled: {
    opacity: 0.6
  },
  invoiceButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  }
});

export default OrderDetailScreen;
