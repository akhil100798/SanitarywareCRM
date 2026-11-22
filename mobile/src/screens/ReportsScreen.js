import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  AlertTriangle,
  Archive,
  Clock,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { reportService } from '../api/services';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { formatDate, formatMoney } from '../utils/formatters';

const TABS = [
  { key: 'gst', label: 'GST Summary', icon: FileSpreadsheet },
  { key: 'aging', label: 'Aging Schedule', icon: Clock },
  { key: 'deadStock', label: 'Dead Stock', icon: Archive },
  { key: 'margins', label: 'Brand Margins', icon: TrendingUp }
];

const KpiCard = ({ title, value, subtitle, highlight }) => (
  <View style={[styles.kpiCard, highlight && styles.kpiCardHighlight]}>
    <Text style={styles.kpiTitle}>{title}</Text>
    <Text style={[styles.kpiValue, highlight && styles.kpiValueHighlight]}>{value}</Text>
    {subtitle ? <Text style={styles.kpiSubtitle}>{subtitle}</Text> : null}
  </View>
);

const ReportsScreen = () => {
  const { user } = useAuth();
  const isAuthorized = ['ADMIN', 'MANAGER'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('gst');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [gstData, setGstData] = useState(null);
  const [agingData, setAgingData] = useState(null);
  const [deadStockData, setDeadStockData] = useState(null);
  const [marginsData, setMarginsData] = useState(null);

  const loadTabData = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      setError('');
      if (activeTab === 'gst') {
        const data = await reportService.getGstTaxSummary();
        setGstData(data);
      } else if (activeTab === 'aging') {
        const data = await reportService.getPaymentAging();
        setAgingData(data);
      } else if (activeTab === 'deadStock') {
        const data = await reportService.getDeadStock({ dormantDays: 60 });
        setDeadStockData(data);
      } else if (activeTab === 'margins') {
        const data = await reportService.getBrandMargins();
        setMarginsData(data);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, isAuthorized]);

  useEffect(() => {
    setLoading(true);
    loadTabData();
  }, [loadTabData]);

  if (!isAuthorized) {
    return (
      <Screen>
        <EmptyView
          icon={AlertTriangle}
          title="Access Restricted"
          message="Financial and inventory analytics are restricted to ADMIN and MANAGER roles."
        />
      </Screen>
    );
  }

  const renderGstTab = () => {
    if (!gstData) return null;
    return (
      <ScrollView
        contentContainerStyle={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTabData(); }} />
        }
      >
        <View style={styles.kpiGrid}>
          <KpiCard
            title="Total Taxable"
            value={formatMoney(gstData.totalTaxableAmount)}
            subtitle={`${gstData.totalInvoices || 0} invoices`}
          />
          <KpiCard
            title="Total GST"
            value={formatMoney(gstData.totalTax)}
            subtitle={`CGST: ${formatMoney(gstData.totalCgst)}`}
            highlight
          />
          <KpiCard
            title="Total Invoiced"
            value={formatMoney(gstData.totalInvoiceAmount)}
            subtitle="Gross sales"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>HSN Tax Breakdown</Text>
          {gstData.hsnBreakdowns?.length ? (
            gstData.hsnBreakdowns.map((hsn, index) => (
              <View key={`${hsn.hsnCode}-${index}`} style={styles.tableRow}>
                <View style={styles.tableColMain}>
                  <Text style={styles.tableItemTitle}>HSN {hsn.hsnCode}</Text>
                  <Text style={styles.tableItemSub}>{hsn.description || 'Sanitaryware / Fittings'}</Text>
                </View>
                <View style={styles.tableColRight}>
                  <Text style={styles.tableItemAmount}>{formatMoney(hsn.taxableAmount)}</Text>
                  <Text style={styles.tableItemRate}>Tax: {formatMoney(hsn.totalTax)} ({hsn.taxRate}%)</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyNotice}>No HSN breakdowns recorded for this period.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Recent Invoices</Text>
          {gstData.invoices?.length ? (
            gstData.invoices.slice(0, 10).map((inv, idx) => (
              <View key={`${inv.invoiceNumber}-${idx}`} style={styles.tableRow}>
                <View style={styles.tableColMain}>
                  <Text style={styles.tableItemTitle}>{inv.invoiceNumber}</Text>
                  <Text style={styles.tableItemSub}>{inv.customerName} {inv.gstin ? `(${inv.gstin})` : ''}</Text>
                  <Text style={styles.tableItemDate}>{formatDate(inv.invoiceDate)}</Text>
                </View>
                <View style={styles.tableColRight}>
                  <Text style={styles.tableItemAmount}>{formatMoney(inv.invoiceTotal)}</Text>
                  <Text style={styles.tableItemRate}>Tax: {formatMoney(inv.totalTax)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyNotice}>No invoices recorded.</Text>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderAgingTab = () => {
    if (!agingData) return null;
    return (
      <ScrollView
        contentContainerStyle={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTabData(); }} />
        }
      >
        <View style={styles.kpiGrid}>
          <KpiCard
            title="Total Outstanding"
            value={formatMoney(agingData.totalOutstanding)}
            subtitle={`${agingData.totalCustomers || 0} customers with dues`}
            highlight
          />
          <KpiCard
            title="0-30 Days"
            value={formatMoney(agingData.bucket0To30)}
            subtitle="Current"
          />
          <KpiCard
            title="31-60 Days"
            value={formatMoney(agingData.bucket31To60)}
            subtitle="Moderate"
          />
          <KpiCard
            title="61-90 Days"
            value={formatMoney(agingData.bucket61To90)}
            subtitle="Overdue"
          />
          <KpiCard
            title="90+ Days"
            value={formatMoney(agingData.bucket90Plus)}
            subtitle="Critical overdue"
            highlight
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Customer Aging Breakdown</Text>
          {agingData.items?.length ? (
            agingData.items.map((cust) => (
              <View key={cust.customerId} style={styles.agingCustomerCard}>
                <View style={styles.customerHeader}>
                  <View style={styles.customerHeaderInfo}>
                    <Text style={styles.customerName}>{cust.customerName}</Text>
                    <Text style={styles.customerType}>{cust.customerType || 'RETAIL'} • {cust.phoneNumber || 'No Phone'}</Text>
                  </View>
                  <Text style={styles.customerTotalDue}>{formatMoney(cust.totalOutstanding)}</Text>
                </View>

                <View style={styles.bucketRow}>
                  <View style={styles.bucketCol}>
                    <Text style={styles.bucketLabel}>0-30d</Text>
                    <Text style={styles.bucketVal}>{formatMoney(cust.bucket0To30)}</Text>
                  </View>
                  <View style={styles.bucketCol}>
                    <Text style={styles.bucketLabel}>31-60d</Text>
                    <Text style={styles.bucketVal}>{formatMoney(cust.bucket31To60)}</Text>
                  </View>
                  <View style={styles.bucketCol}>
                    <Text style={styles.bucketLabel}>61-90d</Text>
                    <Text style={styles.bucketVal}>{formatMoney(cust.bucket61To90)}</Text>
                  </View>
                  <View style={styles.bucketCol}>
                    <Text style={[styles.bucketLabel, styles.bucketLabelOverdue]}>90+d</Text>
                    <Text style={[styles.bucketVal, styles.bucketValOverdue]}>{formatMoney(cust.bucket90Plus)}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyNotice}>No outstanding customer balances.</Text>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderDeadStockTab = () => {
    if (!deadStockData) return null;
    return (
      <ScrollView
        contentContainerStyle={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTabData(); }} />
        }
      >
        <View style={styles.kpiGrid}>
          <KpiCard
            title="Dormant SKUs"
            value={String(deadStockData.totalDormantProducts || 0)}
            subtitle="No sales in 60+ days"
            highlight
          />
          <KpiCard
            title="Tied-up Capital"
            value={formatMoney(deadStockData.totalDormantValue)}
            subtitle="Inventory at cost"
          />
          <KpiCard
            title="Dormant Units"
            value={String(deadStockData.totalDormantStock || 0)}
            subtitle="Total units in warehouse"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Dormant Inventory Items</Text>
          {deadStockData.items?.length ? (
            deadStockData.items.map((item) => (
              <View key={item.productId} style={styles.tableRow}>
                <View style={styles.tableColMain}>
                  <Text style={styles.tableItemTitle}>{item.productName}</Text>
                  <Text style={styles.tableItemSub}>{item.brandName} • SKU: {item.sku || 'N/A'}</Text>
                  <Text style={styles.tableItemDate}>
                    Last sold: {formatDate(item.lastSaleDate)} ({item.daysDormant} days ago)
                  </Text>
                </View>
                <View style={styles.tableColRight}>
                  <Text style={styles.tableItemAmount}>{formatMoney(item.stockValue)}</Text>
                  <Text style={styles.tableItemRate}>{item.currentStock} units in stock</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyNotice}>No dead stock identified. Inventory is turning actively!</Text>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderMarginsTab = () => {
    if (!marginsData) return null;
    return (
      <ScrollView
        contentContainerStyle={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTabData(); }} />
        }
      >
        <View style={styles.kpiGrid}>
          <KpiCard
            title="Total Revenue"
            value={formatMoney(marginsData.totalRevenue)}
            subtitle="Gross sales"
          />
          <KpiCard
            title="Gross Margin"
            value={formatMoney(marginsData.totalGrossMargin)}
            subtitle={`${marginsData.overallMarginPercentage || 0}% overall`}
            highlight
          />
          <KpiCard
            title="Cost of Goods"
            value={formatMoney(marginsData.totalCost)}
            subtitle="Purchases cost"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Brand-Wise Margin Breakdown</Text>
          {marginsData.items?.length ? (
            marginsData.items.map((brand) => (
              <View key={brand.brandId} style={styles.tableRow}>
                <View style={styles.tableColMain}>
                  <Text style={styles.tableItemTitle}>{brand.brandName}</Text>
                  <Text style={styles.tableItemSub}>{brand.unitsSold || 0} units sold</Text>
                  <Text style={styles.tableItemDate}>COGS: {formatMoney(brand.costOfGoodsSold)}</Text>
                </View>
                <View style={styles.tableColRight}>
                  <Text style={styles.tableItemAmount}>{formatMoney(brand.grossMargin)}</Text>
                  <Text style={styles.tableItemMargin}>
                    {brand.marginPercentage || 0}% margin ({formatMoney(brand.revenue)} rev)
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyNotice}>No brand margin records available.</Text>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Reports & Analytics</Text>
        <Text style={styles.screenSubtitle}>Financial summaries, GST, aging & stock health</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Icon size={14} color={active ? '#ffffff' : colors.muted} />
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <LoadingView label="Calculating report metrics..." />
      ) : error ? (
        <ErrorView message={error} onRetry={loadTabData} />
      ) : (
        <>
          {activeTab === 'gst' && renderGstTab()}
          {activeTab === 'aging' && renderAgingTab()}
          {activeTab === 'deadStock' && renderDeadStockTab()}
          {activeTab === 'margins' && renderMarginsTab()}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  screenTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900'
  },
  screenSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: 8
  },
  tabBarScroll: {
    gap: 8,
    paddingHorizontal: 16
  },
  tabBtn: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tabBtnText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700'
  },
  tabBtnTextActive: {
    color: '#ffffff'
  },
  tabContent: {
    padding: 16,
    paddingBottom: 32
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minWidth: '45%',
    padding: 12
  },
  kpiCardHighlight: {
    borderColor: colors.primaryLight || '#99f6e4'
  },
  kpiTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  kpiValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  kpiValueHighlight: {
    color: colors.primaryDark
  },
  kpiSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14
  },
  sectionHeader: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12
  },
  tableRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  tableColMain: {
    flex: 1,
    marginRight: 8
  },
  tableColRight: {
    alignItems: 'flex-end'
  },
  tableItemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  tableItemSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  tableItemDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  tableItemAmount: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800'
  },
  tableItemRate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  tableItemMargin: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2
  },
  agingCustomerCard: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: 12
  },
  customerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  customerHeaderInfo: {
    flex: 1
  },
  customerName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  customerType: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 1
  },
  customerTotalDue: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '900'
  },
  bucketRow: {
    backgroundColor: colors.background,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6
  },
  bucketCol: {
    alignItems: 'center'
  },
  bucketLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700'
  },
  bucketVal: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2
  },
  bucketLabelOverdue: {
    color: '#ef4444'
  },
  bucketValOverdue: {
    color: '#ef4444'
  },
  emptyNotice: {
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 12,
    textAlign: 'center'
  }
});

export default ReportsScreen;
