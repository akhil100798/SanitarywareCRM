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
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
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
      navigation.navigate('OrderDetail', { id: item.orderId });
    }
  };

  const handleRecordPayment = () => {
    navigation.navigate('PaymentForm');
  };

  return (
    <Screen padded={false}>
      <AppHeader
        title="Payment Ledger"
        subtitle="Collections & UTR Receipts"
        onBack={() => navigation?.goBack()}
        rightIcon={Plus}
        onRightPress={handleRecordPayment}
      />

      {/* Search & Filter Header */}
      <View style={styles.header}>
        <View style={styles.searchWrap}>
          <Search color={colors.muted} size={16} strokeWidth={2.2} />
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

      {/* Top KPI Strip */}
      <View style={styles.kpiContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
          {/* Total Collected */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiLabel}>Total Collected</Text>
              <View style={styles.kpiIconWrap}>
                <Wallet color={colors.success} size={15} />
              </View>
            </View>
            <Text style={[styles.kpiAmount, { color: colors.success }]}>
              {formatMoney(stats.totalCollected)}
            </Text>
            <Text style={styles.kpiMeta}>{payments.length} receipts</Text>
          </View>

          {/* Total Outstanding */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiLabel}>Outstanding</Text>
              <View style={styles.kpiIconWrap}>
                <Clock color={colors.warning} size={15} />
              </View>
            </View>
            <Text style={[styles.kpiAmount, { color: colors.warning }]}>
              {formatMoney(stats.totalOutstanding)}
            </Text>
            <Text style={styles.kpiMeta}>Overdue aging balance</Text>
          </View>

          {/* Critical Overdue (>90 days) */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiLabel}>Critical Overdue</Text>
              <View style={styles.kpiIconWrap}>
                <CreditCard color={colors.danger} size={15} />
              </View>
            </View>
            <Text style={[styles.kpiAmount, { color: colors.danger }]}>
              {formatMoney(stats.overdueOver90Days)}
            </Text>
            <Text style={styles.kpiMeta}>&gt;90 days overdue</Text>
          </View>
        </ScrollView>
      </View>

      {/* Transaction List */}
      {loading ? (
        <LoadingView label="Loading payment ledger..." />
      ) : error ? (
        <ErrorView message={error} onRetry={loadLedgerData} />
      ) : (
        <FlatList
          data={filteredPayments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyView
              icon={Receipt}
              title="No transactions found"
              message="No payments match your current search and filter settings."
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => handleRowPress(item)}
              style={styles.transactionCard}
            >
              <View style={styles.transactionTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {item.customerName || `Order #${item.orderId || item.id}`}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(item.paymentDate || item.createdAt)}
                  </Text>
                </View>

                <View style={styles.amountWrap}>
                  <Text style={styles.amountText}>{formatMoney(item.amount)}</Text>
                  <StatusPill label={item.paymentMethod || 'CASH'} type="info" size="sm" />
                </View>
              </View>

              <View style={styles.transactionBottomRow}>
                <View style={styles.refInfo}>
                  <Text style={styles.refText} numberOfLines={1}>
                    Ref: {item.transactionReference || item.referenceNumber || 'Direct Payment'}
                  </Text>
                </View>

                {item.orderId ? (
                  <View style={styles.viewOrderLink}>
                    <Text style={styles.viewOrderLinkText}>Order #{item.orderId}</Text>
                    <ArrowUpRight color={colors.primary} size={14} />
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
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
    padding: 12
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    paddingVertical: 2
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700'
  },
  chipTextActive: {
    color: colors.white
  },
  kpiContainer: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: 10
  },
  kpiScroll: {
    paddingHorizontal: 12,
    gap: 8
  },
  kpiCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 140,
    padding: 10
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  kpiLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  kpiIconWrap: {
    alignItems: 'center',
    borderRadius: 4,
    height: 22,
    justifyContent: 'center',
    width: 22
  },
  kpiAmount: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3
  },
  kpiMeta: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2
  },
  listContent: {
    padding: 12,
    paddingBottom: 28
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12
  },
  transactionTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  customerName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  transactionDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  amountWrap: {
    alignItems: 'flex-end',
    gap: 4
  },
  amountText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900'
  },
  transactionBottomRow: {
    alignItems: 'center',
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6
  },
  refInfo: {
    flex: 1
  },
  refText: {
    color: colors.muted,
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
