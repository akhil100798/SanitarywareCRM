import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Filter,
  Package,
  PackagePlus,
  Search,
  ShieldAlert
} from 'lucide-react-native';
import { productService } from '../api/services';
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme/colors';
import {
  canAccessStockReceive,
  computeNewStock,
  validateStockReceiveQuantity
} from '../utils/opsValidation';

const StockReceiveScreen = ({ navigation }) => {
  const { user } = useAuth();
  const isAuthorized = canAccessStockReceive(user?.role);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [receivedQty, setReceivedQty] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadProducts = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      setError('');
      let list = [];
      if (lowStockOnly) {
        list = await productService.getLowStock();
      } else {
        list = await productService.getAll({ size: 100 });
      }
      setProducts(list);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load product inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthorized, lowStockOnly]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (lowStockOnly && p.minStockLevel !== undefined && p.stockQuantity !== undefined) {
        if (p.stockQuantity > p.minStockLevel) return false;
      }
      if (!q) return true;
      const name = String(p.name || '').toLowerCase();
      const sku = String(p.sku || '').toLowerCase();
      const brand = String(p.brandName || '').toLowerCase();
      return name.includes(q) || sku.includes(q) || brand.includes(q);
    });
  }, [products, searchQuery, lowStockOnly]);

  const qtyValidation = useMemo(
    () => validateStockReceiveQuantity(receivedQty),
    [receivedQty]
  );

  const previewNewStock = useMemo(() => {
    if (!selectedProduct || !qtyValidation.isValid) return null;
    return computeNewStock(selectedProduct.stockQuantity, qtyValidation.quantity);
  }, [selectedProduct, qtyValidation]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setReceivedQty('');
    setReferenceNote('');
    setFeedback(null);
  };

  const handleReceiveStock = async () => {
    if (!selectedProduct) return;
    if (!qtyValidation.isValid) {
      setFeedback({ type: 'error', message: qtyValidation.error || 'Invalid quantity' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const qty = qtyValidation.quantity;
      const reason = referenceNote.trim()
        ? `PO_RECEIVING [Ref: ${referenceNote.trim()}]`
        : 'PO_RECEIVING';

      await productService.updateStock(selectedProduct.id, qty, reason);

      const newStock = computeNewStock(selectedProduct.stockQuantity, qty);

      // Update local state
      setProducts((prev) =>
        prev.map((item) =>
          item.id === selectedProduct.id ? { ...item, stockQuantity: newStock } : item
        )
      );
      setSelectedProduct((prev) => (prev ? { ...prev, stockQuantity: newStock } : null));

      setFeedback({
        type: 'success',
        message: `Successfully received ${qty} units for ${selectedProduct.name}. New Stock: ${newStock}`
      });
      setReceivedQty('');
      setReferenceNote('');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to update stock quantity'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <Screen padded={false}>
        <AppHeader
          title="Stock Receiving"
          subtitle="Access Restricted"
          onBack={() => navigation?.goBack()}
        />
        <View style={styles.unauthorizedWrap}>
          <ShieldAlert color={colors.danger} size={48} />
          <Text style={styles.unauthorizedTitle}>Access Denied</Text>
          <Text style={styles.unauthorizedText}>
            Stock receiving is restricted to Warehouse, Manager, and Admin roles.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <AppHeader
        title="Stock Receiving"
        subtitle="PO Inward & Inventory Adjustments"
        onBack={() => navigation?.goBack()}
      />

      {/* Search & Filter Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrap}>
          <Search color={colors.muted} size={16} strokeWidth={2.2} />
          <TextInput
            placeholder="Search products by SKU, name, or brand..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          onPress={() => setLowStockOnly((prev) => !prev)}
          style={[styles.filterButton, lowStockOnly && styles.filterButtonActive]}
          activeOpacity={0.8}
        >
          <Filter
            size={14}
            color={lowStockOnly ? colors.white : colors.primary}
          />
          <Text
            style={[
              styles.filterButtonText,
              lowStockOnly && styles.filterButtonTextActive
            ]}
          >
            Low Stock
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selected Product PO Inward Form */}
      {selectedProduct && (
        <View style={styles.receiveCard}>
          <View style={styles.receiveCardHeader}>
            <View style={styles.receiveIconWrap}>
              <PackagePlus color={colors.primary} size={20} />
            </View>
            <View style={styles.receiveProductInfo}>
              <Text style={styles.receiveProductName} numberOfLines={1}>
                {selectedProduct.name}
              </Text>
              <Text style={styles.receiveProductSku}>
                SKU: {selectedProduct.sku} • Current Stock:{' '}
                <Text style={styles.boldText}>{selectedProduct.stockQuantity ?? 0}</Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedProduct(null)}
              style={styles.closeCardBtn}
            >
              <Text style={styles.closeCardText}>Dismiss</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.qtyInputWrap}>
              <Text style={styles.fieldLabel}>Quantity Received *</Text>
              <TextInput
                placeholder="e.g. 50"
                placeholderTextColor={colors.muted}
                value={receivedQty}
                onChangeText={setReceivedQty}
                keyboardType="numeric"
                style={[
                  styles.formInput,
                  !qtyValidation.isValid && receivedQty.length > 0 && styles.inputError
                ]}
              />
            </View>

            <View style={styles.noteInputWrap}>
              <Text style={styles.fieldLabel}>PO / Supplier Reference</Text>
              <TextInput
                placeholder="PO-2026-X, Supplier delivery note..."
                placeholderTextColor={colors.muted}
                value={referenceNote}
                onChangeText={setReferenceNote}
                style={styles.formInput}
              />
            </View>
          </View>

          {previewNewStock !== null && (
            <View style={styles.previewStrip}>
              <Text style={styles.previewText}>
                Stock Adjustment Preview: {selectedProduct.stockQuantity ?? 0} +{' '}
                {qtyValidation.quantity} ={' '}
                <Text style={styles.previewNewStockText}>{previewNewStock}</Text>
              </Text>
            </View>
          )}

          {feedback && (
            <View
              style={[
                styles.feedbackBanner,
                feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
              ]}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} color={colors.success} />
              ) : (
                <AlertTriangle size={16} color={colors.danger} />
              )}
              <Text
                style={[
                  styles.feedbackText,
                  feedback.type === 'success'
                    ? styles.feedbackSuccessText
                    : styles.feedbackErrorText
                ]}
              >
                {feedback.message}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleReceiveStock}
            disabled={submitting}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Boxes color={colors.white} size={16} />
                <Text style={styles.submitButtonText}>Confirm Inward Stock</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <LoadingView label="Loading inventory..." />
      ) : error ? (
        <ErrorView message={error} onRetry={loadProducts} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyView
              title="No products match"
              message="Try adjusting your search query or low stock filter."
            />
          }
          renderItem={({ item }) => {
            const isSelected = selectedProduct?.id === item.id;
            const isLow =
              item.minStockLevel !== undefined &&
              item.stockQuantity !== undefined &&
              item.stockQuantity <= item.minStockLevel;

            return (
              <Pressable
                onPress={() => handleSelectProduct(item)}
                style={[styles.productCard, isSelected && styles.productCardSelected]}
              >
                <View style={styles.productCardMain}>
                  <View style={styles.productIconBox}>
                    <Package color={colors.primary} size={18} />
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.productItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.productItemSku}>
                      SKU: {item.sku} {item.brandName ? `• ${item.brandName}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.productCardRight}>
                  <Text style={styles.stockQtyText}>
                    {item.stockQuantity ?? 0} <Text style={styles.stockUnitText}>{item.unit || 'pcs'}</Text>
                  </Text>
                  <StatusPill
                    label={isLow ? 'Low Stock' : 'In Stock'}
                    type={isLow ? 'warning' : 'success'}
                    size="sm"
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  unauthorizedWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: spacing.xl
  },
  unauthorizedTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.md
  },
  unauthorizedText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xs
  },
  searchBarContainer: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 12
  },
  searchInputWrap: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    paddingVertical: 2
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800'
  },
  filterButtonTextActive: {
    color: colors.white
  },
  receiveCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1.5,
    margin: 12,
    padding: 12
  },
  receiveCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10
  },
  receiveIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    marginRight: 10,
    width: 36
  },
  receiveProductInfo: {
    flex: 1
  },
  receiveProductName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  receiveProductSku: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  boldText: {
    color: colors.primary,
    fontWeight: '800'
  },
  closeCardBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  closeCardText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  qtyInputWrap: {
    flex: 1
  },
  noteInputWrap: {
    flex: 1.5
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  formInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  inputError: {
    borderColor: colors.danger
  },
  previewStrip: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 8
  },
  previewText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700'
  },
  previewNewStockText: {
    color: colors.primary,
    fontWeight: '900'
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 6,
    padding: 8,
    marginBottom: 8
  },
  feedbackSuccess: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1
  },
  feedbackError: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1
  },
  feedbackSuccessText: {
    color: colors.success
  },
  feedbackErrorText: {
    color: colors.danger
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800'
  },
  listContent: {
    padding: 12,
    paddingBottom: 28
  },
  productCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    marginBottom: 8
  },
  productCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.primarySubtle
  },
  productCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  productIconBox: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    marginRight: 10,
    width: 36
  },
  productDetails: {
    flex: 1
  },
  productItemName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  productItemSku: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  productCardRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  stockQtyText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900'
  },
  stockUnitText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600'
  }
});

export default StockReceiveScreen;
