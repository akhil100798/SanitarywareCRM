import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { formatDate, formatMoney } from '../utils/formatters';

const TABS = [
  { key: 'gst', label: 'GST Tax', icon: FileSpreadsheet },
  { key: 'aging', label: 'Aging', icon: Clock },
  { key: 'deadStock', label: 'Dead Stock', icon: Archive },
  { key: 'margins', label: 'Margins', icon: TrendingUp }
];

const KpiCard = ({ title, value, subtitle, highlight }) => (
  <View style={[styles.kpiCard, highlight && styles.kpiCardHighlight]}>
    <Text style={styles.kpiTitle}>{title}</Text>
    <Text style={[styles.kpiValue, highlight && styles.kpiValueHighlight]}>{value}</Text>
    {subtitle ? <Text style={styles.kpiSubtitle}>{subtitle}</Text> : null}
  </View>
);

const ReportsScreen = ({ navigation }) => {
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
      <Screen padded={false}>
        <AppHeader title="Reports & Analytics" onBack={() => navigation?.goBack()} />
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
            title="Total Receivables"
            value={formatMoney(agingData.totalOutstanding)}
            subtitle="All aging buckets"
            highlight
          />
          <KpiCard
            title="Current (0-30 d)"
            value={formatMoney(agingData.currentBucket)}
            subtitle="Within terms"
          />
          <KpiCard
            title="Critical Overdue"
            value={formatMoney(agingData.over90Days)}
            subtitle="&gt;90 days overdue"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Outstanding Aging by Customer</Text>
          {agingData.customers?.length ? (
            agingData.customers.map((c, idx) => (
              <View key={`${c.customerId}-${idx}`} style={styles.agingCustomerCard}>
                <View style={styles.customerHeader}>
                  <View style={styles.customerHeaderInfo}>
                    <Text style={styles.customerName}>{c.customerName}</Text>
                    <Text style={styles.customerType}>{c.customerType || 'Customer'}</Text>
                  </View>
                  <Text style={styles.customerTotalDue}>{formatMoney(c.totalDue)}</Text>
                </View>
                <View style={styles.bucketRow}>
                  <View style={styles.bucketCol}><Text style={styles.bucketLabel}>0-30d</Text><Text style={styles.bucketVal}>{formatMoney(c.bucket0to30)}</Text></View>
                  <View style={styles.bucketCol}><Text style={styles.bucketLabel}>31-60d</Text><Text style={styles.bucketVal}>{formatMoney(c.bucket31to60)}</Text></View>
                  <View style={styles.bucketCol}><Text style={styles.bucketLabel}>61-90d</Text><Text style={styles.bucketVal}>{formatMoney(c.bucket61to90)}</Text></View>
                  <View style={styles.bucketCol}><Text style={[styles.bucketLabel, styles.bucketLabelOverdue]}>&gt;90d</Text><Text style={[styles.bucketVal, styles.bucketValOverdue]}>{formatMoney(c.bucketOver90)}</Text></View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyNotice}>No outstanding receivables recorded.</Text>
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
            title="Dormant Items"
            value={deadStockData.totalDeadStockItems ?? 0}
            subtitle="60+ days without sales"
          />
          <KpiCard
            title="Blocked Capital"
            value={formatMoney(deadStockData.totalBlockedCapital)}
            subtitle="Cost of dormant units"
            highlight
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Dead Stock Items</Text>
          {deadStockData.items?.length ? (
            deadStockData.items.map((item, idx) => (
              <View key={`${item.productId}-${idx}`} style={styles.tableRow}>
                <View style={styles.tableColMain}>
                  <Text style={styles.tableItemTitle}>{item.productName}</Text>
                  <Text style={styles.tableItemSub}>SKU: {item.sku} • {item.brandName}</Text>
                  <Text style={styles.tableItemDate}>Dormant for {item.dormantDays} days</Text>
                </View>
                <View style={styles.tableColRight}>
                  <Text style={styles.tableItemAmount}>{item.stockQuantity} {item.unit || 'pcs'}</Text>
                  <Text style={styles.tableItemRate}>Value: {formatMoney(item.blockedValue)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyNotice}>No dead stock items found.</Text>
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
            title="Avg Margin"
            value={`${marginsData.averageMarginPercentage ?? 0}%`}
            subtitle="Portfolio gross margin"
            highlight
          />
          <KpiCard
            title="Tracked Brands"
            value={marginsData.brandMargins?.length ?? 0}
            subtitle="Active supplier lines"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Gross Margin by Brand</Text>
          {marginsData.brandMargins?.length ? (
            marginsData.brandMargins.map((b, idx) => (
              <View key={`${b.brandId}-${idx}`} style={styles.tableRow}>
                <View style={styles.tableColMain}>
                  <Text style={styles.tableItemTitle}>{b.brandName}</Text>
                  <Text style={styles.tableItemSub}>{b.totalProducts} products</Text>
                </View>
                <View style={styles.tableColRight}>
                  <Text style={[styles.tableItemAmount, { color: colors.primary }]}>{b.grossMarginPercentage}%</Text>
                  <Text style={styles.tableItemRate}>Revenue: {formatMoney(b.totalRevenue)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyNotice}>No brand margin metrics available.</Text>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <Screen padded={false}>
      <AppHeader
        title="Reports & Analytics"
        subtitle="GST, Aging, Dead Stock & Margins"
        onBack={() => navigation?.goBack()}
      />

      {/* Tab Navigation */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.8}
            >
              <Icon size={14} color={isActive ? colors.primary : colors.muted} />
              <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <LoadingView label="Loading analytics..." />
      ) : error ? (
        <ErrorView message={error} onRetry={loadTabData} />
      ) : activeTab === 'gst' ? (
        renderGstTab()
      ) : activeTab === 'aging' ? (
        renderAgingTab()
      ) : activeTab === 'deadStock' ? (
        renderDeadStockTab()
      ) : (
        renderMarginsTab()
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  tabsRow: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  tabButtonActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1
  },
  tabButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700'
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '800'
  },
  tabContent: {
    padding: 12,
    paddingBottom: 28
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    padding: 10
  },
  kpiCardHighlight: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle
  },
  kpiTitle: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  kpiValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2
  },
  kpiValueHighlight: {
    color: colors.primary
  },
  kpiSubtitle: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12
  },
  sectionHeader: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8
  },
  tableRow: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  tableColMain: {
    flex: 1,
    marginRight: 8
  },
  tableItemTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  tableItemSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  tableItemDate: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2
  },
  tableColRight: {
    alignItems: 'flex-end'
  },
  tableItemAmount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  tableItemRate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  agingCustomerCard: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingVertical: 8
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  customerHeaderInfo: {
    flex: 1
  },
  customerName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  customerType: {
    color: colors.muted,
    fontSize: 10
  },
  customerTotalDue: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900'
  },
  bucketRow: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4
  },
  bucketCol: {
    alignItems: 'center'
  },
  bucketLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700'
  },
  bucketVal: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1
  },
  bucketLabelOverdue: {
    color: colors.danger
  },
  bucketValOverdue: {
    color: colors.danger
  },
  emptyNotice: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8
  }
});

export default ReportsScreen;
