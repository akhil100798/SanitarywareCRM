import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { Database, Search } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { productService, resolveMediaUrl } from '../api/services';
import { offlineSyncManager } from '../utils/offlineSyncManager';
import AppHeader from '../components/AppHeader';
import ListCard from '../components/ListCard';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { formatMoney } from '../utils/formatters';
import { createLatestRequestRunner } from '../utils/latestRequest';

const mapProduct = (product) => {
  const rawImg = product.images?.find((img) => img.isPrimary)?.imageUrl ||
    product.images?.[0]?.imageUrl ||
    product.imageUrls?.[0] ||
    product.imageUrl;
  return {
    id: product.id,
    title: product.name,
    subtitle: [product.sku || 'No SKU', product.brandName].filter(Boolean).join(' | '),
    meta: `Stock ${product.stockQuantity ?? 0} ${product.unit || ''}`,
    amount: formatMoney(product.sellingPrice),
    badge: product.stockQuantity <= product.reorderLevel ? 'Low stock' : 'In stock',
    imageUrl: resolveMediaUrl ? resolveMediaUrl(rawImg) : rawImg,
    raw: product
  };
};

const ProductPickerScreen = ({ route, navigation }) => {
  const targetScreen = route?.params?.targetScreen || 'QuotationForm';
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isOfflineSource, setIsOfflineSource] = useState(false);
  const requests = useRef(null);
  if (!requests.current) requests.current = createLatestRequestRunner();

  const loadFromOfflineCache = useCallback(async (q) => {
    try {
      const cached = await offlineSyncManager.getCachedProducts();
      const filtered = q.trim()
        ? cached.filter((p) => {
          const needle = q.toLowerCase();
          return (
            (p.name && p.name.toLowerCase().includes(needle)) ||
            (p.sku && p.sku.toLowerCase().includes(needle)) ||
            (p.brandName && p.brandName.toLowerCase().includes(needle))
          );
        })
        : cached;
      setProducts(filtered.map(mapProduct));
      setIsOfflineSource(true);
      setError('');
    } catch (cacheErr) {
      setError(getErrorMessage(cacheErr));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadProducts = useCallback(async (nextQuery = '') => {
    setError('');
    const isForced = await offlineSyncManager.isForcedOffline();
    if (isForced) {
      return loadFromOfflineCache(nextQuery);
    }

    await requests.current.run(() => productService.searchProducts(nextQuery, { size: 50 }), {
      onSuccess: (data) => {
        setError('');
        setIsOfflineSource(false);
        const list = Array.isArray(data) ? data : data?.content || [];
        setProducts(list.map(mapProduct));
        if (!nextQuery.trim() && list.length > 0) {
          offlineSyncManager.getCachedCustomers().then((custs) => {
            offlineSyncManager.cacheMasterData({ products: list, customers: custs });
          }).catch(() => { });
        }
      },
      onError: async (err) => {
        const cached = await offlineSyncManager.getCachedProducts();
        if (cached && cached.length > 0) {
          loadFromOfflineCache(nextQuery);
        } else {
          setError(getErrorMessage(err));
        }
      },
      onFinally: () => {
        setLoading(false);
        setRefreshing(false);
      }
    });
  }, [loadFromOfflineCache]);

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(query), query.trim() ? 350 : 0);
    const runner = requests.current;
    return () => {
      clearTimeout(timer);
      runner.invalidate();
    };
  }, [loadProducts, query]);

  if (loading) return <LoadingView label="Loading products..." />;
  if (error) return <ErrorView message={error} onRetry={() => loadProducts(query)} />;

  return (
    <Screen padded={false}>
      <AppHeader
        title="Select Product"
        subtitle={isOfflineSource ? 'Offline Catalog Cache' : 'Showroom Inventory'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search color={colors.muted} size={16} strokeWidth={2.2} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder={isOfflineSource ? 'Search cached products...' : 'Search products by name, SKU, or brand'}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={query}
          />
        </View>
        {isOfflineSource && (
          <View style={styles.offlineNotice}>
            <StatusPill label="Offline Cache" type="warning" size="sm" />
          </View>
        )}
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={products}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <EmptyView
            icon={isOfflineSource ? Database : null}
            message={
              isOfflineSource
                ? 'No items found in local cache. Connect online and refresh catalog cache in Outbox.'
                : 'Try another product name or SKU.'
            }
            title={isOfflineSource ? 'No cached products match' : 'No products found'}
          />
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              setRefreshing(true);
              loadProducts(query);
            }}
            refreshing={refreshing}
          />
        }
        renderItem={({ item }) => (
          <ListCard
            item={item}
            onPress={() => {
              navigation.navigate({
                name: targetScreen,
                params: { selectedProduct: item.raw },
                merge: true
              });
            }}
          />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: 12
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.background,
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
  offlineNotice: {
    marginTop: 6
  },
  list: {
    padding: 12,
    paddingBottom: 28
  }
});

export default ProductPickerScreen;
