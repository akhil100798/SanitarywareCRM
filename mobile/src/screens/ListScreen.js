import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Search } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { fetchList, listServices } from '../api/services';
import ListCard from '../components/ListCard';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import CreateBrandModal from '../components/CreateBrandModal';
import { colors } from '../theme/colors';
import { createLatestRequestRunner } from '../utils/latestRequest';

const ListScreen = ({ route, navigation }) => {
  const resource = route.params.resource;
  const config = useMemo(() => listServices[resource], [resource]);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
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
  const showBack = route.name === 'ModuleList';

  return (
    <Screen padded={false} safeTop={false}>
      {/* Swiss Ceramic Minimalist Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {showBack ? (
              <TouchableOpacity
                accessibilityLabel="Go back"
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
              >
                <ArrowLeft size={20} color={colors.white} strokeWidth={2.2} />
              </TouchableOpacity>
            ) : null}
            <View>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.count}>{items.length} records</Text>
            </View>
          </View>
          {canAdd && (
            <TouchableOpacity
              onPress={handleOpenAdd}
              style={styles.addBtn}
              activeOpacity={0.8}
              accessibilityLabel={`Add ${resource === 'customers' ? 'Customer' : resource === 'orders' ? 'Order' : 'Brand'}`}
            >
              <Plus size={16} color={colors.primary} strokeWidth={2.4} />
              <Text style={styles.addBtnText}>
                {resource === 'customers' ? 'Add' : resource === 'orders' ? 'New Order' : 'Add Brand'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {config.searchEndpoint ? (
          <View style={styles.searchBox}>
            <Search color={colors.muted} size={16} strokeWidth={2.2} />
            <TextInput
              autoCapitalize="none"
              onChangeText={handleSearch}
              placeholder={`Search ${config.title.toLowerCase()}...`}
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
        renderItem={({ item }) => (
          <ListCard
            item={item}
            onNavigateDetail={(id) => {
              const routeMap = {
                customers: 'CustomerDetail',
                products: 'ProductDetail',
                brands: 'BrandDetail',
                quotations: 'QuotationDetail',
                orders: 'OrderDetail'
              };
              if (routeMap[resource]) {
                navigation.navigate(routeMap[resource], { id });
              }
            }}
          />
        )}
      />

      {showAddBrand && (
        <CreateBrandModal
          onClose={() => setShowAddBrand(false)}
          onCreated={handleBrandCreated}
          visible={showAddBrand}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    borderBottomColor: colors.primaryDark,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3
  },
  count: {
    color: '#ccfbf1',
    fontSize: 11,
    fontWeight: '600'
  },
  addBtn: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  addBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800'
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
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
    fontSize: 14,
    paddingVertical: 2
  },
  list: {
    padding: 12,
    paddingBottom: 28
  }
});

export default ListScreen;
