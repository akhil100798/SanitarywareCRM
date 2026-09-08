import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Building2,
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

const modules = [
  { resource: 'quotations', title: 'Quotations', subtitle: 'Customer estimates and quote status', icon: FileText, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { resource: 'payments', title: 'Payments', subtitle: 'Customer payment records', icon: CreditCard, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { resource: 'distributors', title: 'Distributors', subtitle: 'Suppliers and outstanding balances', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
  { resource: 'purchaseOrders', title: 'Purchase Orders', subtitle: 'Purchases from distributors', icon: ReceiptIndianRupee, roles: ['ADMIN', 'MANAGER'] },
  { resource: 'distributorPayments', title: 'Distributor Payments', subtitle: 'Payments made to suppliers', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
  { resource: 'brands', title: 'Brands', subtitle: 'Product brand catalog', icon: Tags },
  { resource: 'categories', title: 'Categories', subtitle: 'Product category tree', icon: FolderTree, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { resource: 'settings', title: 'Settings', subtitle: 'Company profile and billing settings', icon: Settings, roles: ['ADMIN', 'MANAGER'] }
];

const ModuleMenuScreen = ({ navigation }) => {
  const { user } = useAuth();
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
        return (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate('ModuleList', { resource: item.resource })}
            style={styles.card}
          >
            <View style={styles.iconWrap}>
              <Icon color={colors.primary} size={22} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.cardTitle}>{item.title}</Text>
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
  textWrap: {
    flex: 1
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3
  }
});

export default ModuleMenuScreen;
