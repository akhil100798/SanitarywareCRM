import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import {
  ArrowUpRight,
  Clock,
  CreditCard,
  Plus,
  Receipt,
  Search,
  Wallet
} from 'lucide-react-native';
import { paymentService, reportService } from '../api/services';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme/colors';
import { formatDate, formatMoney } from '../utils/formatters';
import {
  calculatePaymentLedgerStats,
  filterPaymentLedger
} from '../utils/opsValidation';

const MODE_CHIPS = ['All', 'UPI', 'NEFT', 'Cash'];

const PaymentLedgerScreen = ({ navigation }) => {
  const { user } = useAuth();
  const isAuthorized = ['ADMIN', 'MANAGER', 'SALES'].includes(user?.role);

  const [payments, setPayments] = useState([]);
  const [agingData, setAgingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState('All');

  const loadLedgerData = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      setError('');
      const [paymentsList, aging] = await Promise.all([
        paymentService.getAll().catch(() => []),
        reportService.getPaymentAging().catch(() => null)
      ]);
      setPayments(Array.isArray(paymentsList) ? paymentsList : []);
      setAgingData(aging);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load payment ledger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    loadLedgerData();
  }, [loadLedgerData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLedgerData();
  };

  const filteredPayments = useMemo(
    () => filterPaymentLedger(payments, { mode: selectedMode, query: searchQuery }),
    [payments, selectedMode, searchQuery]
  );

  const stats = useMemo(
    () => calculatePaymentLedgerStats(payments, agingData),
    [payments, agingData]
  );

  const handleRowPress = (item) => {
    if (item.orderId) {
      navigation.navigate('OrderDetail', { orderId: item.orderId });
    }
  };

  const handleRecordPayment = () => {
    navigation.navigate('PaymentForm');
  };

  return (
    <Screen padded={false}>
      {/* Header Bar with Action Button */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Payment Ledger</Text>
            <Text style={styles.subtitle}>Collections, aging schedule & customer UTRs</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRecordPayment}
            style={styles.recordPaymentBtn}
          >
            <Plus color={colors.surface} size={16} />
            <Text style={styles.recordPaymentBtnText}>Record</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchWrap}>
          <Search color={colors.muted} size={18} style={styles.searchIcon} />
          <TextInput
            accessibilityLabel="Search customer, order, or reference"
            placeholder="Search customer, order ID, or UTR / reference..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Payment Mode Filter Chips */}
        <View style={styles.chipsRow}>
          {MODE_CHIPS.map((mode) => {
            const isActive = selectedMode.toUpperCase() === mode.toUpperCase();
            return (
              <TouchableOpacity
                key={mode}
                activeOpacity={0.75}
                onPress={() => setSelectedMode(mode)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{mode}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Top KPI & Aging Summary Strip */}
      <View style={styles.kpiContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiScroll}>
          {/* Total Collected */}
          <View style={[styles.kpiCard, styles.kpiCardCollected]}>
            <View style={styles.kpiIconWrapCollected}>
              <Wallet color={colors.success} size={18} />
            </View>
            <Text style={styles.kpiLabel}>Total Collected</Text>
            <Text style={[styles.kpiAmount, { color: colors.success }]}>
              {formatMoney(stats.totalCollected)}
            </Text>
            <Text style={styles.kpiMeta}>{payments.length} transactions</Text>
          </View>

          {/* Total Outstanding */}
          <View style={[styles.kpiCard, styles.kpiCardOutstanding]}>
            <View style={styles.kpiIconWrapOutstanding}>
              <Clock color={colors.warning} size={18} />
            </View>
            <Text style={styles.kpiLabel}>Total Outstanding</Text>
            <Text style={[styles.kpiAmount, { color: colors.warning }]}>
              {formatMoney(stats.totalOutstanding)}
            </Text>
            <Text style={styles.kpiMeta}>Overdue balance</Text>
          </View>

          {/* Aging 0-30 Days */}
          <View style={styles.kpiCard}>
            <Text style={styles.agingTitle}>0–30 Days</Text>
            <Text style={styles.agingAmount}>
              {formatMoney(stats.agingBuckets['0-30'])}
            </Text>
            <Text style={styles.agingSub}>Current</Text>
          </View>

          {/* Aging 31-60 Days */}
          <View style={styles.kpiCard}>
            <Text style={styles.agingTitle}>31–60 Days</Text>
            <Text style={styles.agingAmount}>
              {formatMoney(stats.agingBuckets['31-60'])}
            </Text>
            <Text style={styles.agingSub}>Follow-up</Text>
          </View>

          {/* Aging 61-90 Days */}
          <View style={styles.kpiCard}>
            <Text style={styles.agingTitle}>61–90 Days</Text>
            <Text style={[styles.agingAmount, { color: '#c2410c' }]}>
              {formatMoney(stats.agingBuckets['61-90'])}
            </Text>
            <Text style={styles.agingSub}>Critical</Text>
          </View>

          {/* Aging 90+ Days */}
          <View style={[styles.kpiCard, { marginRight: spacing.lg }]}>
            <Text style={styles.agingTitle}>90+ Days</Text>
            <Text style={[styles.agingAmount, { color: colors.danger }]}>
              {formatMoney(stats.agingBuckets['90+'])}
            </Text>
            <Text style={styles.agingSub}>Severe Overdue</Text>
          </View>
        </ScrollView>
      </View>

      {/* Ledger Transactions List */}
      {loading ? (
        <LoadingView message="Loading payment transactions & ledger..." />
      ) : error ? (
        <ErrorView message={error} onRetry={loadLedgerData} />
      ) : filteredPayments.length === 0 ? (
        <EmptyView
          actionLabel="Record Payment"
          message={
            searchQuery
              ? `No transactions matching "${searchQuery}"`
              : selectedMode !== 'All'
              ? `No ${selectedMode} payments found.`
              : 'No recorded payments found.'
          }
          onAction={handleRecordPayment}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredPayments}
          keyExtractor={(item, index) => String(item.id || item.transactionId || index)}
          refreshControl={
            <RefreshControl
              colors={[colors.primary]}
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={onRefresh}
            />
          }
          renderItem={({ item }) => {
            const method = (item.paymentMethod || 'PAYMENT').toUpperCase();
            const dateStr = item.paymentDate || item.createdAt;

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleRowPress(item)}
                style={styles.transactionCard}
              >
                <View style={styles.transactionTopRow}>
                  <View style={styles.customerInfoWrap}>
                    <View style={styles.methodIconWrap}>
                      <CreditCard color={colors.primary} size={16} />
                    </View>
                    <View style={styles.customerTextWrap}>
                      <Text numberOfLines={1} style={styles.customerName}>
                        {item.customerName || item.customer?.name || `Customer #${item.customerId || 'N/A'}`}
                      </Text>
                      <Text style={styles.transactionDate}>{formatDate(dateStr)}</Text>
                    </View>
                  </View>
                  <View style={styles.amountWrap}>
                    <Text style={styles.amountText}>{formatMoney(item.amount)}</Text>
                    <View style={styles.methodBadge}>
                      <Text style={styles.methodBadgeText}>{method}</Text>
                    </View>
                  </View>
                </View>

                {/* Sub row with Order ID, Reference / UTR and navigation hint */}
                <View style={styles.transactionBottomRow}>
                  <View style={styles.refInfo}>
                    {item.orderId ? (
                      <View style={styles.orderPill}>
                        <Receipt color={colors.muted} size={12} />
                        <Text style={styles.orderPillText}>Order #{item.orderId}</Text>
                      </View>
                    ) : null}
                    {(item.referenceNumber || item.transactionId) ? (
                      <Text numberOfLines={1} style={styles.refText}>
                        Ref: {item.referenceNumber || item.transactionId}
                      </Text>
                    ) : null}
                  </View>

                  {item.orderId ? (
                    <View style={styles.viewOrderLink}>
                      <Text style={styles.viewOrderLinkText}>View Order</Text>
                      <ArrowUpRight color={colors.primary} size={13} />
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: spacing.lg
  },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  headerTitleWrap: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2
  },
  recordPaymentBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  recordPaymentBtnText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800'
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingHorizontal: 10
  },
  searchIcon: {
    marginRight: 6
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    paddingVertical: 8
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4
  },
  chip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700'
  },
  chipTextActive: {
    color: colors.surface
  },
  kpiContainer: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: spacing.md
  },
  kpiScroll: {
    paddingLeft: spacing.lg
  },
  kpiCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: spacing.sm,
    minWidth: 130,
    padding: spacing.md
  },
  kpiCardCollected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0'
  },
  kpiCardOutstanding: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a'
  },
  kpiIconWrapCollected: {
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    height: 28,
    justifyContent: 'center',
    marginBottom: 6,
    width: 28
  },
  kpiIconWrapOutstanding: {
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    height: 28,
    justifyContent: 'center',
    marginBottom: 6,
    width: 28
  },
  kpiLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700'
  },
  kpiAmount: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2
  },
  kpiMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  agingTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700'
  },
  agingAmount: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4
  },
  agingSub: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2
  },
  listContent: {
    padding: spacing.md
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  transactionTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  customerInfoWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: spacing.sm
  },
  methodIconWrap: {
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 36
  },
  customerTextWrap: {
    flex: 1
  },
  customerName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  transactionDate: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  amountWrap: {
    alignItems: 'flex-end',
    gap: 4
  },
  amountText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900'
  },
  methodBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  methodBadgeText: {
    color: '#0369a1',
    fontSize: 10,
    fontWeight: '800'
  },
  transactionBottomRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs
  },
  refInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginRight: spacing.sm
  },
  orderPill: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  orderPillText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700'
  },
  refText: {
    color: colors.muted,
    flex: 1,
    fontSize: 11
  },
  viewOrderLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2
  },
  viewOrderLinkText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  }
});

export default PaymentLedgerScreen;
