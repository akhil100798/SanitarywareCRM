import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getErrorMessage } from '../api/client';
import { orderService, paymentService } from '../api/services';
import DetailSection from '../components/DetailSection';
import FieldRow from '../components/FieldRow';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { formatDate, formatMoney } from '../utils/formatters';

const OrderDetailScreen = ({ route, navigation }) => {
  const orderId = route.params?.id;
  const refreshKey = route.params?.refreshKey;
  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    try {
      setError('');
      const [orderData, paymentData] = await Promise.all([
        orderService.getById(orderId),
        paymentService.getByOrder(orderId)
      ]);
      setOrder(orderData);
      setPayments(paymentData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder, refreshKey]);

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

        <DetailSection title="Order Summary">
          <FieldRow label="Customer" value={order.customerName} />
          <FieldRow label="Order Date" value={formatDate(order.orderDate)} />
          <FieldRow label="Order Status" value={order.status} />
          <FieldRow label="Payment Status" value={order.paymentStatus} />
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

        <DetailSection title="Payment Summary">
          <View style={styles.totalRow}><Text>Subtotal</Text><Text>{formatMoney(order.subtotal)}</Text></View>
          <View style={styles.totalRow}><Text>Total</Text><Text>{formatMoney(order.total)}</Text></View>
          <View style={styles.totalRow}><Text>Paid</Text><Text>{formatMoney(order.paidAmount)}</Text></View>
          <View style={styles.grandRow}><Text style={styles.grandText}>Balance</Text><Text style={styles.grandText}>{formatMoney(order.balanceAmount)}</Text></View>
        </DetailSection>

        <DetailSection title="Payment History">
          {payments.length ? (
            payments.map((payment) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View>
                  <Text style={styles.paymentTitle}>{payment.paymentNumber || `Payment #${payment.id}`}</Text>
                  <Text style={styles.paymentMeta}>
                    {formatDate(payment.paymentDate)} | {payment.paymentMethod}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>{formatMoney(payment.amount)}</Text>
              </View>
            ))
          ) : (
            <EmptyView title="No payments recorded" message="Record a payment when the customer pays." />
          )}
        </DetailSection>
      </ScrollView>
      <PrimaryActionBar
        label="Record Payment"
        secondaryLabel="Refresh"
        onSecondaryPress={() => {
          setRefreshing(true);
          loadOrder();
        }}
        onPress={() =>
          navigation.navigate('PaymentForm', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            balanceAmount: order.balanceAmount
          })
        }
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
    alignItems: 'flex-start',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  paymentTitle: {
    color: colors.text,
    fontWeight: '900'
  },
  paymentMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  paymentAmount: {
    color: colors.success,
    fontWeight: '900'
  }
});

export default OrderDetailScreen;
