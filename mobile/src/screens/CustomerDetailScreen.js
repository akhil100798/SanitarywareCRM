import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getErrorMessage } from '../api/client';
import { customerService } from '../api/services';
import DetailSection from '../components/DetailSection';
import FieldRow from '../components/FieldRow';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { formatDate, formatMoney, joinAddress } from '../utils/formatters';

const MiniCard = ({ title, subtitle, amount, badge, onPress }) => (
  <Pressable style={({ pressed }) => [styles.miniCard, pressed && styles.pressed]} onPress={onPress}>
    <View style={styles.miniHeader}>
      <Text style={styles.miniTitle} numberOfLines={2}>{title}</Text>
      {amount ? <Text style={styles.amount}>{amount}</Text> : null}
    </View>
    {subtitle ? <Text style={styles.miniSubtitle}>{subtitle}</Text> : null}
    {badge ? <Text style={styles.badge}>{badge}</Text> : null}
  </Pressable>
);

const CustomerDetailScreen = ({ route, navigation }) => {
  const customerId = route.params?.id;
  const [customer, setCustomer] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [customerData, quotationData, orderData] = await Promise.all([
        customerService.getById(customerId),
        customerService.getQuotations(customerId),
        customerService.getOrders(customerId)
      ]);
      setCustomer(customerData);
      setQuotations(quotationData.slice(0, 5));
      setOrders(orderData.slice(0, 5));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingView label="Loading customer..." />;
  if (error) return <ErrorView message={error} onRetry={loadData} />;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.title}>{customer?.name}</Text>
          <Text style={styles.subtitle}>{customer?.company || customer?.phoneNumber || 'Customer'}</Text>
        </View>

        <DetailSection title="Customer Details">
          <FieldRow label="Company" value={customer?.company} />
          <FieldRow label="Phone" value={customer?.phoneNumber} />
          <FieldRow label="Email" value={customer?.email} />
          <FieldRow label="Address" value={joinAddress(customer)} />
          <FieldRow label="City" value={customer?.city} />
          <FieldRow label="Type" value={customer?.customerType} />
          <FieldRow label="Status" value={customer?.isActive === false ? 'Inactive' : 'Active'} />
        </DetailSection>

        <DetailSection title="Recent Quotations">
          {quotations.length ? (
            quotations.map((quotation) => (
              <MiniCard
                key={quotation.id}
                title={quotation.quotationNumber || `Quotation #${quotation.id}`}
                subtitle={formatDate(quotation.quotationDate)}
                amount={formatMoney(quotation.total)}
                badge={quotation.status}
                onPress={() => navigation.navigate('QuotationDetail', { id: quotation.id })}
              />
            ))
          ) : (
            <EmptyView title="No quotations yet" message="Create the first quotation for this customer." />
          )}
        </DetailSection>

        <DetailSection title="Recent Orders">
          {orders.length ? (
            orders.map((order) => (
              <MiniCard
                key={order.id}
                title={order.orderNumber || `Order #${order.id}`}
                subtitle={formatDate(order.orderDate)}
                amount={formatMoney(order.total)}
                badge={order.paymentStatus || order.status}
                onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
              />
            ))
          ) : (
            <EmptyView title="No orders yet" message="Converted quotations will appear here." />
          )}
        </DetailSection>
      </ScrollView>
      <PrimaryActionBar
        label="Create Quotation"
        onPress={() =>
          navigation.navigate('QuotationForm', {
            customerId: customer.id,
            customerName: customer.name
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
  hero: {
    marginBottom: 14
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4
  },
  miniCard: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: 10
  },
  pressed: {
    opacity: 0.75
  },
  miniHeader: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  miniTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '800'
  },
  miniSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  amount: {
    color: colors.primaryDark,
    fontWeight: '900'
  },
  badge: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4
  }
});

export default CustomerDetailScreen;
