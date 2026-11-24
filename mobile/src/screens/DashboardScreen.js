import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  IndianRupee,
  LogOut,
  Package,
  ShoppingCart,
  TrendingUp,
  Users
} from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { dashboardService, inventoryAnalyticsService } from '../api/services';
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const formatMoney = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;

const StatTile = ({ icon: Icon, label, value, tone = colors.primary, sub }) => (
  <View style={styles.tile}>
    <View style={styles.tileHeader}>
      <Text style={styles.tileLabel}>{label}</Text>
      <View style={[styles.iconWrap, { backgroundColor: `${tone}15` }]}>
        <Icon color={tone} size={18} strokeWidth={2.2} />
      </View>
    </View>
    <Text style={styles.tileValue} numberOfLines={1}>{value}</Text>
    {sub ? <Text style={styles.tileSub} numberOfLines={1}>{sub}</Text> : null}
  </View>
);

const DashboardScreen = ({ navigation }) => {
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
      <AppHeader
        title="Dashboard"
        subtitle={`Welcome, ${user?.fullName || user?.username}`}
        rightIcon={Bell}
        onRightPress={() => navigation?.navigate('Notifications')}
      />
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
        {/* User bar & sign out */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.sectionLabel}>Operations Overview</Text>
            <Text style={styles.showroomTitle}>HydroSleek Showroom</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={logout}
            style={styles.logoutButton}
          >
            <LogOut color={colors.danger} size={16} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Revenue KPI Card */}
        {canViewFinancials && (
          <View style={styles.revenueCard}>
            <View style={styles.revenueTop}>
              <View>
                <Text style={styles.revenueLabel}>Total Showroom Revenue</Text>
                <Text style={styles.revenueValue}>{formatMoney(stats?.totalRevenue)}</Text>
              </View>
              <View style={styles.trendBadge}>
                <TrendingUp size={14} color={colors.primary} />
                <Text style={styles.trendText}>YTD</Text>
              </View>
            </View>
            <View style={styles.revenueBreakdown}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Receivables</Text>
                <Text style={[styles.breakdownVal, { color: colors.warning }]}>
                  {formatMoney(stats?.totalReceivables)}
                </Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Payables</Text>
                <Text style={[styles.breakdownVal, { color: colors.textSecondary }]}>
                  {formatMoney(stats?.totalPayables)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 2x2 or 2x3 Metric Grid */}
        <View style={styles.grid}>
          <StatTile
            icon={ShoppingCart}
            label="Total Orders"
            value={stats?.totalOrders ?? 0}
            sub="Fulfillment pipeline"
          />
          <StatTile
            icon={AlertTriangle}
            label="Pending Orders"
            value={stats?.pendingOrders ?? 0}
            tone={colors.warning}
            sub="Awaiting dispatch"
          />
          {canViewCustomerData && (
            <StatTile
              icon={Users}
              label="Customers"
              value={stats?.totalCustomers ?? 0}
              tone={colors.accent}
              sub="Registered accounts"
            />
          )}
          <StatTile
            icon={Package}
            label="Low Stock Items"
            value={stats?.lowStockProducts ?? 0}
            tone={colors.danger}
            sub="Needs reordering"
          />
          {canViewFinancials && (
            <StatTile
              icon={CreditCard}
              label="Distributor Paid"
              value={formatMoney(stats?.distributorPaymentsTotal)}
              sub="Settled purchases"
            />
          )}
          {canViewFinancials && (
            <StatTile
              icon={IndianRupee}
              label="Receivables"
              value={formatMoney(stats?.totalReceivables)}
              tone={colors.success}
              sub="Pending collection"
            />
          )}
        </View>

        {/* Inventory Health & Low Stock Alerts */}
        {canViewInventory && inventoryHealth ? (
          <View style={styles.inventoryCard}>
            <View style={styles.inventoryHeader}>
              <View>
                <Text style={styles.inventoryTitle}>Inventory Health</Text>
                <Text style={styles.inventorySub}>
                  Reorder Est: {formatMoney(inventoryHealth.totalReorderEstimatedCost)}
                </Text>
              </View>
              <StatusPill
                status={inventoryHealth.lowStockCount > 0 ? 'ATTENTION' : 'HEALTHY'}
                type={inventoryHealth.lowStockCount > 0 ? 'warning' : 'success'}
              />
            </View>

            <View style={styles.healthStatsRow}>
              <View style={styles.healthStat}>
                <CheckCircle2 size={16} color={colors.success} />
                <Text style={styles.healthStatValue}>{inventoryHealth.healthyStockCount ?? 0}</Text>
                <Text style={styles.healthStatLabel}>Healthy</Text>
              </View>
              <View style={styles.healthStat}>
                <AlertTriangle size={16} color={colors.warning} />
                <Text style={[styles.healthStatValue, { color: colors.warning }]}>
                  {inventoryHealth.lowStockCount ?? 0}
                </Text>
                <Text style={styles.healthStatLabel}>Low Stock</Text>
              </View>
              <View style={styles.healthStat}>
                <Package size={16} color={colors.danger} />
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
                    <StatusPill
                      status={`Deficit: -${alert.deficit}`}
                      type={alert.urgency === 'OUT_OF_STOCK' ? 'danger' : 'warning'}
                    />
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
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  showroomTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  logoutText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800'
  },
  revenueCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14
  },
  revenueTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  revenueLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  revenueValue: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  trendText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  revenueBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 10
  },
  breakdownItem: {
    flex: 1
  },
  breakdownDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 12
  },
  breakdownLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700'
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    width: '48.5%',
    justifyContent: 'space-between'
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  tileLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flex: 1
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 6,
    height: 30,
    justifyContent: 'center',
    width: 30
  },
  tileValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3
  },
  tileSub: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3
  },
  inventoryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 14
  },
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: colors.borderLight,
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 12
  },
  inventoryTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900'
  },
  inventorySub: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
  },
  healthStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 4
  },
  healthStat: {
    alignItems: 'center',
    gap: 2
  },
  healthStatValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2
  },
  healthStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700'
  },
  alertsList: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingTop: 10
  },
  alertsSectionTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  alertRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomColor: colors.borderLight,
    borderBottomWidth: 1
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
  }
});

export default DashboardScreen;
