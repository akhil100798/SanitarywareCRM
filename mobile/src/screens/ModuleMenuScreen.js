import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronRight,
  CloudOff,
  CreditCard,
  FileText,
  FolderTree,
  ReceiptIndianRupee,
  Settings,
  Tags,
  Truck,
  UserCheck
} from 'lucide-react-native';
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { offlineSyncManager } from '../utils/offlineSyncManager';

const modules = [
  {
    resource: 'offlineSync',
    title: 'Offline Outbox & Sync',
    subtitle: 'Manage offline quotations and catalog cache',
    icon: CloudOff,
    isDirectScreen: true,
    screen: 'OfflineSync',
    roles: ['ADMIN', 'MANAGER', 'SALES']
  },
  {
    resource: 'stockReceive',
    title: 'Stock Receiving',
    subtitle: 'Warehouse PO receiving & stock-in',
    icon: Boxes,
    isDirectScreen: true,
    screen: 'StockReceive',
    roles: ['ADMIN', 'MANAGER', 'WAREHOUSE']
  },
  {
    resource: 'paymentLedger',
    title: 'Payment Ledger',
    subtitle: 'Collections, UTR receipts & aging schedule',
    icon: CreditCard,
    isDirectScreen: true,
    screen: 'PaymentLedger',
    roles: ['ADMIN', 'MANAGER', 'SALES']
  },
  { resource: 'quotations', title: 'Quotations', subtitle: 'Customer estimates and quote status', icon: FileText, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  {
    resource: 'notifications',
    title: 'Notifications & Alerts',
    subtitle: 'Dispatch logs, retry failed alerts & triggers',
    icon: Bell,
    isDirectScreen: true,
    screen: 'Notifications',
    roles: ['ADMIN', 'MANAGER']
  },
  {
    resource: 'reports',
    title: 'Reports & Analytics',
    subtitle: 'GST summaries, aging schedule & inventory health',
    icon: BarChart3,
    isDirectScreen: true,
    screen: 'Reports',
    roles: ['ADMIN', 'MANAGER']
  },
  { resource: 'payments', title: 'Payments', subtitle: 'Customer payment records', icon: CreditCard, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { resource: 'distributors', title: 'Distributors', subtitle: 'Suppliers and outstanding balances', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
  { resource: 'purchaseOrders', title: 'Purchase Orders', subtitle: 'Purchases from distributors', icon: ReceiptIndianRupee, roles: ['ADMIN', 'MANAGER'] },
  { resource: 'distributorPayments', title: 'Distributor Payments', subtitle: 'Payments made to suppliers', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
  { resource: 'brands', title: 'Brands', subtitle: 'Product brand catalog', icon: Tags, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { resource: 'categories', title: 'Categories', subtitle: 'Product category tree', icon: FolderTree, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { resource: 'settings', title: 'Settings', subtitle: 'Company profile and billing settings', icon: Settings, roles: ['ADMIN', 'MANAGER'] },
  {
    resource: 'profileSettings',
    title: 'Profile & Settings',
    subtitle: 'Account details, API status & app configuration',
    icon: UserCheck,
    isDirectScreen: true,
    screen: 'ProfileSettings',
    roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE']
  }
];

const ModuleMenuScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      try {
        const count = await offlineSyncManager.getPendingCount();
        setPendingCount(count);
      } catch {
        // ignore
      }
    };
    updateCount();
    const unsub = offlineSyncManager.subscribe(updateCount);
    return () => unsub();
  }, []);

  const visibleModules = modules.filter((module) => !module.roles || module.roles.includes(user?.role));

  return (
    <Screen padded={false}>
      <AppHeader
        title="Modules & Operations"
        subtitle="Sanitaryware CRM Workflows"
      />
      <FlatList
        contentContainerStyle={styles.list}
        data={visibleModules}
        keyExtractor={(item) => item.resource}
        renderItem={({ item }) => {
          const Icon = item.icon;
          const isOfflineItem = item.resource === 'offlineSync';

          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                if (item.isDirectScreen) {
                  navigation.navigate(item.screen);
                } else {
                  navigation.navigate('ModuleList', { resource: item.resource });
                }
              }}
              style={styles.card}
            >
              <View style={[styles.iconWrap, isOfflineItem && pendingCount > 0 && styles.iconWrapPending]}>
                <Icon color={isOfflineItem && pendingCount > 0 ? colors.warning : colors.primary} size={20} strokeWidth={2.2} />
              </View>
              <View style={styles.textWrap}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {isOfflineItem && pendingCount > 0 && (
                    <StatusPill status={`${pendingCount} queued`} type="warning" size="sm" />
                  )}
                </View>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={18} color={colors.muted} />
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 14,
    paddingBottom: 28
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 12
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  iconWrapPending: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder
  },
  textWrap: {
    flex: 1
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  }
});

export default ModuleMenuScreen;
