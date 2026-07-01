import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  AlertCircle,
  CreditCard,
  IndianRupee,
  LogOut,
  Package,
  ShoppingCart,
  Users
} from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { dashboardService } from '../api/services';
import Screen from '../components/Screen';
import { ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const formatMoney = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;

const StatTile = ({ icon: Icon, label, value, tone = colors.primary }) => (
  <View style={styles.tile}>
    <View style={[styles.iconWrap, { backgroundColor: `${tone}18` }]}>
      <Icon color={tone} size={22} />
    </View>
    <Text style={styles.tileValue}>{value}</Text>
    <Text style={styles.tileLabel}>{label}</Text>
  </View>
);

const DashboardScreen = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    try {
      setError('');
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return <LoadingView label="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={loadStats} />;
  }

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStats();
            }}
          />
        }
      >
        <View style={styles.topbar}>
          <View>
            <Text style={styles.greeting}>Welcome</Text>
            <Text style={styles.name}>{user?.fullName || user?.username}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <LogOut color={colors.danger} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueValue}>{formatMoney(stats?.totalRevenue)}</Text>
          <Text style={styles.revenueSub}>
            Receivables {formatMoney(stats?.totalReceivables)} | Payables {formatMoney(stats?.totalPayables)}
          </Text>
        </View>

        <View style={styles.grid}>
          <StatTile icon={ShoppingCart} label="Orders" value={stats?.totalOrders ?? 0} />
          <StatTile icon={AlertCircle} label="Pending" value={stats?.pendingOrders ?? 0} tone={colors.warning} />
          <StatTile icon={Users} label="Customers" value={stats?.totalCustomers ?? 0} tone={colors.accent} />
          <StatTile icon={Package} label="Low Stock" value={stats?.lowStockProducts ?? 0} tone={colors.danger} />
          <StatTile icon={CreditCard} label="Distributor Paid" value={formatMoney(stats?.distributorPaymentsTotal)} />
          <StatTile icon={IndianRupee} label="Receivables" value={formatMoney(stats?.totalReceivables)} tone={colors.success} />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28
  },
  topbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18
  },
  greeting: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 10
  },
  revenueCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    marginBottom: 16,
    padding: 18
  },
  revenueLabel: {
    color: '#bfdbfe',
    fontSize: 13,
    fontWeight: '700'
  },
  revenueValue: {
    color: colors.surface,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8
  },
  revenueSub: {
    color: '#dbeafe',
    fontSize: 12,
    marginTop: 8
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 126,
    padding: 14,
    width: '48%'
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    marginBottom: 12,
    width: 40
  },
  tileValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800'
  },
  tileLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  }
});

export default DashboardScreen;
