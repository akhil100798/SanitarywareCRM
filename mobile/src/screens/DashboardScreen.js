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
import { dashboardService, inventoryAnalyticsService } from '../api/services';
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
  const canViewCustomerData = ['ADMIN', 'MANAGER', 'SALES'].includes(user?.role);
  const canViewFinancials = ['ADMIN', 'MANAGER', 'SALES'].includes(user?.role);
  const canViewInventory = ['ADMIN', 'MANAGER', 'WAREHOUSE'].includes(user?.role);
  const [stats, setStats] = useState(null);
  const [inventoryHealth, setInventoryHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    try {
      setError('');
      const [data, invSummary] = await Promise.all([
        dashboardService.getStats(),
        canViewInventory ? inventoryAnalyticsService.getSummary().catch(() => null) : Promise.resolve(null)
      ]);
      setStats(data);
      if (invSummary) {
        setInventoryHealth(invSummary);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canViewInventory]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return <LoadingView label="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={loadStats} onLogout={logout} />;
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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={logout}
            style={styles.logoutButton}
          >
            <LogOut color={colors.danger} size={20} />
          </TouchableOpacity>
        </View>

        {canViewFinancials && <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueValue}>{formatMoney(stats?.totalRevenue)}</Text>
          <Text style={styles.revenueSub}>
            Receivables {formatMoney(stats?.totalReceivables)} | Payables {formatMoney(stats?.totalPayables)}
          </Text>
        </View>}

        <View style={styles.grid}>
          <StatTile icon={ShoppingCart} label="Orders" value={stats?.totalOrders ?? 0} />
          <StatTile icon={AlertCircle} label="Pending" value={stats?.pendingOrders ?? 0} tone={colors.warning} />
          {canViewCustomerData && <StatTile icon={Users} label="Customers" value={stats?.totalCustomers ?? 0} tone={colors.accent} />}
          <StatTile icon={Package} label="Low Stock" value={stats?.lowStockProducts ?? 0} tone={colors.danger} />
          {canViewFinancials && <StatTile icon={CreditCard} label="Distributor Paid" value={formatMoney(stats?.distributorPaymentsTotal)} />}
          {canViewFinancials && <StatTile icon={IndianRupee} label="Receivables" value={formatMoney(stats?.totalReceivables)} tone={colors.success} />}
        </View>

        {canViewInventory && inventoryHealth ? (
          <View style={styles.inventoryCard}>
            <View style={styles.inventoryHeader}>
              <Text style={styles.inventoryTitle}>Inventory Health & Alerts</Text>
              <Text style={styles.inventorySub}>
                Reorder Est: {formatMoney(inventoryHealth.totalReorderEstimatedCost)}
              </Text>
            </View>
            <View style={styles.healthStatsRow}>
              <View style={styles.healthStat}>
                <Text style={styles.healthStatValue}>{inventoryHealth.healthyStockCount ?? 0}</Text>
                <Text style={styles.healthStatLabel}>Healthy</Text>
              </View>
              <View style={styles.healthStat}>
                <Text style={[styles.healthStatValue, { color: colors.warning }]}>
                  {inventoryHealth.lowStockCount ?? 0}
                </Text>
                <Text style={styles.healthStatLabel}>Low Stock</Text>
              </View>
              <View style={styles.healthStat}>
                <Text style={[styles.healthStatValue, { color: colors.danger }]}>
                  {inventoryHealth.outOfStockCount ?? 0}
                </Text>
                <Text style={styles.healthStatLabel}>Out of Stock</Text>
              </View>
            </View>
            {inventoryHealth.lowStockAlerts?.length > 0 ? (
              <View style={styles.alertsList}>
                <Text style={styles.alertsSectionTitle}>Priority Restock Needed</Text>
                {inventoryHealth.lowStockAlerts.slice(0, 3).map((alert) => (
                  <View key={alert.productId} style={styles.alertRow}>
                    <View style={styles.alertMain}>
                      <Text style={styles.alertProduct}>{alert.productName}</Text>
                      <Text style={styles.alertSku}>
                        SKU: {alert.sku} | In Stock: {alert.stockQuantity} (Min: {alert.reorderLevel})
                      </Text>
                    </View>
                    <View style={[
                      styles.urgencyBadge,
                      alert.urgency === 'OUT_OF_STOCK' ? styles.urgencyOut :
                      alert.urgency === 'CRITICAL' ? styles.urgencyCritical : styles.urgencyLow
                    ]}>
                      <Text style={[
                        styles.urgencyText,
                        alert.urgency === 'OUT_OF_STOCK' ? styles.urgencyOutText :
                        alert.urgency === 'CRITICAL' ? styles.urgencyCriticalText : styles.urgencyLowText
                      ]}>
                        Deficit: -{alert.deficit}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
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
  },
  inventoryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    padding: 16
  },
  inventoryHeader: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: 12,
    paddingBottom: 10
  },
  inventoryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  inventorySub: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  healthStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
    paddingVertical: 6
  },
  healthStat: {
    alignItems: 'center'
  },
  healthStatValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900'
  },
  healthStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2
  },
  alertsList: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 12
  },
  alertsSectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  alertRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  alertMain: {
    flex: 1,
    marginRight: 8
  },
  alertProduct: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  alertSku: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  urgencyBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  urgencyOut: {
    backgroundColor: '#fee2e2'
  },
  urgencyCritical: {
    backgroundColor: '#ffedd5'
  },
  urgencyLow: {
    backgroundColor: '#fef9c3'
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '800'
  },
  urgencyOutText: {
    color: '#b91c1c'
  },
  urgencyCriticalText: {
    color: '#c2410c'
  },
  urgencyLowText: {
    color: '#a16207'
  }
});

export default DashboardScreen;
