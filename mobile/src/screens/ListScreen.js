import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Search } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { fetchList, listServices } from '../api/services';
import ListCard from '../components/ListCard';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import CreateCustomerModal from '../components/CreateCustomerModal';
import CreateBrandModal from '../components/CreateBrandModal';
import { colors } from '../theme/colors';
import { createLatestRequestRunner } from '../utils/latestRequest';

const detailRoutes = {
  customers: 'CustomerDetail',
  products: 'ProductDetail',
  brands: 'BrandDetail',
  quotations: 'QuotationDetail',
  orders: 'OrderDetail'
};

const ListScreen = ({ route, navigation }) => {
  const resource = route.params.resource;
  const config = useMemo(() => listServices[resource], [resource]);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const requests = useRef(null);
  if (!requests.current) requests.current = createLatestRequestRunner();

  const loadItems = useCallback(
    async (nextQuery = '') => {
      setError('');
      await requests.current.run(() => fetchList(resource, nextQuery), {
        onSuccess: (data) => { setError(''); setItems(data); },
        onError: (err) => setError(getErrorMessage(err)),
        onFinally: () => { setLoading(false); setRefreshing(false); }
      });
    },
    [resource]
  );

  useEffect(() => {
    const timer = setTimeout(() => loadItems(query), config.searchEndpoint && query.trim() ? 350 : 0);
    const runner = requests.current;
    return () => { clearTimeout(timer); runner.invalidate(); };
  }, [config.searchEndpoint, loadItems, query]);

  useFocusEffect(
    useCallback(() => {
      loadItems(query);
    }, [loadItems, query])
  );

  const handleSearch = (value) => {
    setQuery(value);
  };

  const handleOpenAdd = () => {
    if (resource === 'customers') {
      navigation.navigate('CustomerForm');
      return;
    }
    if (resource === 'orders') {
      navigation.navigate('OrderForm');
      return;
    }
    if (resource === 'brands') setShowAddBrand(true);
  };

  const handleCustomerCreated = (newCust) => {
    setShowAddCustomer(false);
    loadItems();
    navigation.navigate('CustomerDetail', { id: newCust.id });
  };

  const handleBrandCreated = (newBrand) => {
    setShowAddBrand(false);
    loadItems();
    navigation.navigate('BrandDetail', { id: newBrand.id });
  };

  if (loading) {
    return <LoadingView label={`Loading ${config.title.toLowerCase()}...`} />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => loadItems()} />;
  }

  const canAdd = resource === 'customers' || resource === 'brands' || resource === 'orders';

  return (
    <Screen padded={false} safeTop={route.name !== 'ModuleList'}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.count}>{items.length} records</Text>
          </View>
          {canAdd && (
            <TouchableOpacity
              onPress={handleOpenAdd}
              style={styles.addBtn}
              activeOpacity={0.8}
              accessibilityLabel={`Add ${resource === 'customers' ? 'Customer' : resource === 'orders' ? 'Order' : 'Brand'}`}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>
                {resource === 'customers' ? 'Add Customer' : resource === 'orders' ? 'New Order' : 'Add Brand'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {config.searchEndpoint ? (
          <View style={styles.searchBox}>
            <Search color={colors.muted} size={18} />
            <TextInput
              autoCapitalize="none"
              onChangeText={handleSearch}
              placeholder={`Search ${config.title.toLowerCase()}`}
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={query}
            />
          </View>
        ) : null}
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <EmptyView title={`No ${config.title.toLowerCase()} found`} message="Pull to refresh or try again later." />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadItems(query);
            }}
          />
        }
        renderItem={({ item }) => {
          const detailRoute = detailRoutes[resource];
          return (
            <ListCard
              item={item}
              onPress={detailRoute && resource !== 'products' ? () => navigation.navigate(detailRoute, { id: item.id }) : undefined}
              onNavigateDetail={resource === 'products' ? (id) => navigation.navigate('ProductDetail', { id }) : undefined}
            />
          );
        }}
      />

      {/* Modals */}
      <CreateCustomerModal
        visible={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSuccess={handleCustomerCreated}
      />
      <CreateBrandModal
        visible={showAddBrand}
        onClose={() => setShowAddBrand(false)}
        onSuccess={handleBrandCreated}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  count: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    paddingVertical: 12
  },
  list: {
    padding: 16,
    paddingBottom: 28
  }
});

export default ListScreen;
