import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { productService } from '../api/services';
import ListCard from '../components/ListCard';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { formatMoney } from '../utils/formatters';

const mapProduct = (product) => ({
  id: product.id,
  title: product.name,
  subtitle: [product.sku || 'No SKU', product.brandName].filter(Boolean).join(' | '),
  meta: `Stock ${product.stockQuantity ?? 0} ${product.unit || ''}`,
  amount: formatMoney(product.sellingPrice),
  badge: product.stockQuantity <= product.reorderLevel ? 'Low stock' : 'In stock',
  raw: product
});

const ProductPickerScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadProducts = useCallback(async (nextQuery = '') => {
    try {
      setError('');
      const data = await productService.searchProducts(nextQuery, { size: 50 });
      setProducts(data.map(mapProduct));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts('');
  }, [loadProducts]);

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(query), 350);
    return () => clearTimeout(timer);
  }, [loadProducts, query]);

  if (loading) return <LoadingView label="Loading products..." />;
  if (error) return <ErrorView message={error} onRetry={() => loadProducts(query)} />;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Product</Text>
        <View style={styles.searchBox}>
          <Search color={colors.muted} size={18} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder="Search products"
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
        ListEmptyComponent={<EmptyView title="No products found" message="Try another product name or SKU." />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadProducts(query);
            }}
          />
        }
        renderItem={({ item }) => (
          <ListCard
            item={item}
            onPress={() =>
              navigation.navigate({
                name: 'QuotationForm',
                params: { selectedProduct: item.raw },
                merge: true
              })
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
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

export default ProductPickerScreen;
