import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Edit3, FileText, ShoppingCart, User } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { customerService } from '../api/services';
import AppHeader from '../components/AppHeader';
import DetailSection from '../components/DetailSection';
import FieldRow from '../components/FieldRow';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { formatDate, formatMoney, joinAddress } from '../utils/formatters';

const MiniCard = ({ title, subtitle, amount, badge, onPress }) => (
  <Pressable style={({ pressed }) => [styles.miniCard, pressed && styles.pressed]} onPress={onPress}>
    <View style={styles.miniHeader}>
      <Text style={styles.miniTitle} numberOfLines={2}>{title}</Text>
      {amount ? <Text style={styles.amount}>{amount}</Text> : null}
    </View>
    <View style={styles.miniFooter}>
      {subtitle ? <Text style={styles.miniSubtitle}>{subtitle}</Text> : <View />}
      {badge ? <StatusPill status={badge} size="sm" /> : null}
    </View>
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) return <LoadingView label="Loading customer..." />;
  if (error) return <ErrorView message={error} onRetry={loadData} />;

  return (
    <Screen padded={false}>
      <AppHeader
        title={customer?.name || 'Customer Details'}
        subtitle={customer?.customerType ? `${customer.customerType} Account` : 'Showroom Client'}
        onBack={() => navigation.goBack()}
        rightIcon={Edit3}
        onRightPress={() => navigation.navigate('CustomerForm', { id: customer?.id })}
      />

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
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <User color={colors.primary} size={28} strokeWidth={2.2} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.title}>{customer?.name}</Text>
            <Text style={styles.subtitle}>{customer?.company || customer?.phoneNumber || 'Customer'}</Text>
            <View style={styles.badgeRow}>
              <StatusPill
                label={customer?.customerType || 'RETAIL'}
                type="info"
                size="sm"
              />
              <StatusPill
                label={customer?.isActive === false ? 'Inactive' : 'Active'}
                type={customer?.isActive === false ? 'danger' : 'success'}
                size="sm"
              />
            </View>
          </View>
        </View>

        <DetailSection title="Contact & Billing Information">
          <FieldRow label="Company" value={customer?.company} />
          <FieldRow label="Phone" value={customer?.phoneNumber} />
          <FieldRow label="Email" value={customer?.email} />
          <FieldRow label="GSTIN" value={customer?.gstNumber} />
          <FieldRow label="State" value={customer?.state} />
          <FieldRow label="Address" value={joinAddress(customer)} />
          <FieldRow label="City" value={customer?.city} />
        </DetailSection>

        <DetailSection
          title={`Recent Quotations (${quotations.length})`}
          action={
            <FileText size={16} color={colors.primary} />
          }
        >
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

        <DetailSection
          title={`Recent Orders (${orders.length})`}
          action={
            <ShoppingCart size={16} color={colors.primary} />
          }
        >
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
        secondaryLabel="Create Order"
        onSecondaryPress={() =>
          navigation.navigate('OrderForm', {
            customerId: customer?.id,
            customerName: customer?.name
          })
        }
        label="Create Quotation"
        onPress={() =>
          navigation.navigate('QuotationForm', {
            customerId: customer?.id,
            customerName: customer?.name
          })
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 14,
    paddingBottom: 28
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 14
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    marginRight: 12,
    width: 48
  },
  profileInfo: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6
  },
  miniCard: {
    borderTopColor: colors.borderLight,
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
    fontSize: 14,
    fontWeight: '800'
  },
  miniFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  miniSubtitle: {
    color: colors.muted,
    fontSize: 11
  },
  amount: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900'
  }
});

export default CustomerDetailScreen;
