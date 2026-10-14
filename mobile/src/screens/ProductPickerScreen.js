import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { productService } from '../api/services';
import ListCard from '../components/ListCard';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { formatMoney } from '../utils/formatters';
import { usePagedItems } from '../utils/usePagedItems';

const mapProduct = (product) => ({
  id: product.id,
  title: product.name,
  subtitle: [product.sku || 'No SKU', product.brandName].filter(Boolean).join(' | '),
  meta: `Stock ${product.stockQuantity ?? 0} ${product.unit || ''}`,
  amount: formatMoney(product.sellingPrice),
  badge: product.stockQuantity <= product.reorderLevel ? 'Low stock' : 'In stock',
  raw: product
});
const fetchProductPage = async (query, page) => {
  const result = await productService.searchProductPage(query, page);
  return { ...result, items: result.items.map(mapProduct) };
};

const ProductPickerScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const { items: products, total, hasNext, loading, loadingMore, error, reload, loadMore } = usePagedItems(fetchProductPage, query);

  if (loading) return <LoadingView label="Loading products..." />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Product</Text>
        <Text>{products.length} of {total} records</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel product selection" onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
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
        ListFooterComponent={hasNext ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Load more products" accessibilityState={{ disabled: loadingMore }}
            disabled={loadingMore} onPress={loadMore} style={styles.more}>
            <Text>{loadingMore ? 'Loading more...' : 'Load more products'}</Text>
          </Pressable>
        ) : null}
        ListEmptyComponent={<EmptyView title="No products found" message="Try another product name or SKU." />}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={reload}
          />
        }
        renderItem={({ item }) => (
          <ListCard
            item={item}
            onPress={() =>
              navigation.popTo('QuotationForm', { selectedProduct: item.raw })
            }
          />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  more: { alignItems: 'center', padding: 16 },
  cancel: { color: colors.primary, paddingVertical: 10, fontWeight: '700' },
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
