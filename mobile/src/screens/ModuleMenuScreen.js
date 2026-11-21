import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Building2,
  CloudOff,
  CreditCard,
  FileText,
  FolderTree,
  ReceiptIndianRupee,
  Settings,
  Tags,
  Truck
} from 'lucide-react-native';
import Screen from '../components/Screen';
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
  { resource: 'quotations', title: 'Quotations', subtitle: 'Customer estimates and quote status', icon: FileText, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { resource: 'payments', title: 'Payments', subtitle: 'Customer payment records', icon: CreditCard, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { resource: 'distributors', title: 'Distributors', subtitle: 'Suppliers and outstanding balances', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
  { resource: 'purchaseOrders', title: 'Purchase Orders', subtitle: 'Purchases from distributors', icon: ReceiptIndianRupee, roles: ['ADMIN', 'MANAGER'] },
  { resource: 'distributorPayments', title: 'Distributor Payments', subtitle: 'Payments made to suppliers', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
  { resource: 'brands', title: 'Brands', subtitle: 'Product brand catalog', icon: Tags, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { resource: 'categories', title: 'Categories', subtitle: 'Product category tree', icon: FolderTree, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { resource: 'settings', title: 'Settings', subtitle: 'Company profile and billing settings', icon: Settings, roles: ['ADMIN', 'MANAGER'] }
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
      <View style={styles.header}>
        <Text style={styles.title}>More Modules</Text>
        <Text style={styles.subtitle}>Open the remaining CRM areas.</Text>
      </View>
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
                <Icon color={isOfflineItem && pendingCount > 0 ? '#d97706' : colors.primary} size={22} />
              </View>
              <View style={styles.textWrap}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {isOfflineItem && pendingCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingCount} queued</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: 16
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  list: {
    padding: 16,
    paddingBottom: 28
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 14
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  iconWrapPending: {
    backgroundColor: '#fef3c7'
  },
  textWrap: {
    flex: 1
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  badge: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde047',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2
  },
  badgeText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '800'
  }
});

export default ModuleMenuScreen;
