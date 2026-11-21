import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Database, Search, WifiOff } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { productService, resolveMediaUrl } from '../api/services';
import { offlineSyncManager } from '../utils/offlineSyncManager';
import ListCard from '../components/ListCard';
import Screen from '../components/Screen';
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

const ProductPickerScreen = ({ navigation }) => {
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
        // Keep offline cache warm in background if it was an empty/broad search
        if (!nextQuery.trim() && list.length > 0) {
          offlineSyncManager.getCachedCustomers().then((custs) => {
            offlineSyncManager.cacheMasterData({ products: list, customers: custs });
          }).catch(() => {});
        }
      },
      onError: async (err) => {
        // Fallback to offline cache if network call fails
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
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Select Product</Text>
          {isOfflineSource && (
            <View style={styles.offlinePill}>
              <WifiOff color="#92400e" size={12} />
              <Text style={styles.offlinePillText}>Offline Cache</Text>
            </View>
          )}
        </View>
        <View style={styles.searchBox}>
          <Search color={colors.muted} size={18} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder={isOfflineSource ? 'Search cached products...' : 'Search products'}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={query}
          />
        </View>
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
            onPress={() =>
              navigation.navigate(
                'QuotationForm',
                { selectedProduct: item.raw },
                { merge: true, pop: true }
              )
            }
          />
        )}
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
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  offlinePill: {
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderColor: '#fde047',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  offlinePillText: {
    color: '#92400e',
    fontSize: 11,
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
    paddingVertical: 10
  },
  list: {
    padding: 16,
    paddingBottom: 28
  }
});

export default ProductPickerScreen;
