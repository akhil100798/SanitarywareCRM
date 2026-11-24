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
  ArrowRight,
  Boxes,
  CheckCircle2,
  Filter,
  Package,
  PackagePlus,
  Search,
  ShieldAlert
} from 'lucide-react-native';
import { productService } from '../api/services';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme/colors';
import {
  canAccessStockReceive,
  computeNewStock,
  validateStockReceiveQuantity
} from '../utils/opsValidation';

const StockReceiveScreen = () => {
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
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

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
      <Screen padded>
        <View style={styles.unauthorizedWrap}>
          <ShieldAlert color={colors.danger} size={48} />
          <Text style={styles.unauthorizedTitle}>Access Restricted</Text>
          <Text style={styles.unauthorizedDesc}>
            Warehouse PO stock-in requires ADMIN, MANAGER, or WAREHOUSE permissions.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Stock Receiving</Text>
            <Text style={styles.subtitle}>Receive supplier shipments & update inventory</Text>
          </View>
          <View style={styles.headerBadge}>
            <Boxes color={colors.primary} size={18} />
            <Text style={styles.headerBadgeText}>{filteredProducts.length}</Text>
          </View>
        </View>

        {/* Search Bar & Filter Toggle */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Search color={colors.muted} size={18} style={styles.searchIcon} />
            <TextInput
              accessibilityLabel="Search product or SKU"
              placeholder="Search product, SKU or brand..."
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setLowStockOnly((prev) => !prev)}
            style={[styles.filterButton, lowStockOnly && styles.filterButtonActive]}
          >
            <Filter color={lowStockOnly ? colors.surface : colors.primary} size={16} />
            <Text style={[styles.filterButtonText, lowStockOnly && styles.filterButtonTextActive]}>
              Low Stock
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Product Stock-In Action Card */}
      {selectedProduct && (
        <View style={styles.receiveCard}>
          <View style={styles.receiveCardHeader}>
            <View style={styles.receiveIconWrap}>
              <PackagePlus color={colors.primary} size={20} />
            </View>
            <View style={styles.receiveProductInfo}>
              <Text numberOfLines={1} style={styles.receiveProductName}>
                {selectedProduct.name}
              </Text>
              <Text style={styles.receiveProductSku}>
                SKU: {selectedProduct.sku || 'N/A'} | Current Stock:{' '}
                <Text style={styles.boldText}>{selectedProduct.stockQuantity ?? 0}</Text>
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedProduct(null)}
              style={styles.closeCardBtn}
            >
              <Text style={styles.closeCardText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Quantity & Reference Inputs */}
          <View style={styles.inputGrid}>
            <View style={styles.qtyInputWrap}>
              <Text style={styles.fieldLabel}>Received Qty *</Text>
              <TextInput
                accessibilityLabel="Received Quantity"
                keyboardType="numeric"
                placeholder="e.g. 25"
                placeholderTextColor={colors.muted}
                style={[
                  styles.formInput,
                  receivedQty !== '' && !qtyValidation.isValid && styles.inputError
                ]}
                value={receivedQty}
                onChangeText={(text) => {
                  setReceivedQty(text);
                  setFeedback(null);
                }}
              />
            </View>

            <View style={styles.noteInputWrap}>
              <Text style={styles.fieldLabel}>Supplier / PO Ref</Text>
              <TextInput
                accessibilityLabel="Supplier or PO Reference"
                placeholder="e.g. PO-2026-081"
                placeholderTextColor={colors.muted}
                style={styles.formInput}
                value={referenceNote}
                onChangeText={setReferenceNote}
              />
            </View>
          </View>

          {/* Stock Preview Math Strip */}
          {previewNewStock !== null && (
            <View style={styles.previewStrip}>
              <Text style={styles.previewLabel}>Stock Update Preview:</Text>
              <View style={styles.previewMathRow}>
                <Text style={styles.previewNumber}>{selectedProduct.stockQuantity ?? 0}</Text>
                <Text style={styles.previewOperator}>+</Text>
                <Text style={[styles.previewNumber, styles.previewAdded]}>
                  {qtyValidation.quantity}
                </Text>
                <ArrowRight color={colors.primary} size={14} style={{ marginHorizontal: 4 }} />
                <Text style={[styles.previewNumber, styles.previewResult]}>{previewNewStock}</Text>
                <Text style={styles.previewUnit}>units</Text>
              </View>
            </View>
          )}

          {/* Feedback banner */}
          {feedback && (
            <View
              style={[
                styles.feedbackBanner,
                feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
              ]}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 color={colors.success} size={16} />
              ) : (
                <AlertTriangle color={colors.danger} size={16} />
              )}
              <Text
                style={[
                  styles.feedbackText,
                  feedback.type === 'success' ? styles.feedbackTextSuccess : styles.feedbackTextError
                ]}
              >
                {feedback.message}
              </Text>
            </View>
          )}

          {/* Confirm Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!qtyValidation.isValid || submitting}
            onPress={handleReceiveStock}
            style={[
              styles.submitBtn,
              (!qtyValidation.isValid || submitting) && styles.submitBtnDisabled
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <>
                <PackagePlus color={colors.surface} size={18} />
                <Text style={styles.submitBtnText}>Confirm Stock In</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Product List */}
      {loading ? (
        <LoadingView message="Loading warehouse inventory..." />
      ) : error ? (
        <ErrorView message={error} onRetry={loadProducts} />
      ) : filteredProducts.length === 0 ? (
        <EmptyView
          actionLabel="Refresh Catalog"
          message={
            searchQuery
              ? `No products matching "${searchQuery}"`
              : lowStockOnly
              ? 'No low-stock items detected!'
              : 'No products available.'
          }
          onAction={loadProducts}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              colors={[colors.primary]}
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={onRefresh}
            />
          }
          renderItem={({ item }) => {
            const isSelected = selectedProduct?.id === item.id;
            const currentStock = item.stockQuantity ?? 0;
            const isLow = item.minStockLevel && currentStock <= item.minStockLevel;

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectProduct(item)}
                style={[styles.productCard, isSelected && styles.productCardSelected]}
              >
                <View style={styles.productMainRow}>
                  <View style={[styles.productIconWrap, isLow && styles.productIconWrapLow]}>
                    <Package color={isLow ? colors.warning : colors.primary} size={20} />
                  </View>
                  <View style={styles.productDetails}>
                    <Text numberOfLines={1} style={styles.productName}>
                      {item.name}
                    </Text>
                    <Text style={styles.productMeta}>
                      SKU: {item.sku || 'No SKU'}
                      {item.brandName ? ` • ${item.brandName}` : ''}
                    </Text>
                  </View>
                  <View style={styles.stockColumn}>
                    <View style={[styles.stockPill, isLow && styles.stockPillLow]}>
                      <Text style={[styles.stockPillText, isLow && styles.stockPillTextLow]}>
                        {currentStock} in stock
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleSelectProduct(item)}
                      style={[styles.actionTag, isSelected && styles.actionTagSelected]}
                    >
                      <Text
                        style={[
                          styles.actionTagText,
                          isSelected && styles.actionTagTextSelected
                        ]}
                      >
                        {isSelected ? 'Selected' : '+ Receive'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </TouchableOpacity>
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
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl
  },
  unauthorizedTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.md
  },
  unauthorizedDesc: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center'
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: spacing.lg
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  headerTitleWrap: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2
  },
  headerBadge: {
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  headerBadgeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800'
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  searchInputWrap: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 10
  },
  searchIcon: {
    marginRight: 6
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    paddingVertical: 8
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  filterButtonActive: {
    backgroundColor: colors.primary
  },
  filterButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700'
  },
  filterButtonTextActive: {
    color: colors.surface
  },
  receiveCard: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
    borderRadius: 12,
    borderWidth: 1.5,
    margin: spacing.md,
    padding: spacing.md
  },
  receiveCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.md
  },
  receiveIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 36
  },
  receiveProductInfo: {
    flex: 1
  },
  receiveProductName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  receiveProductSku: {
    color: colors.muted,
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700'
  },
  inputGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  qtyInputWrap: {
    flex: 1
  },
  noteInputWrap: {
    flex: 1.5
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4
  },
  formInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  inputError: {
    borderColor: colors.danger
  },
  previewStrip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#99f6e4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  previewLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  previewMathRow: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  previewNumber: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  previewOperator: {
    color: colors.muted,
    fontWeight: '800',
    marginHorizontal: 4
  },
  previewAdded: {
    color: colors.success
  },
  previewResult: {
    color: colors.primary,
    fontSize: 15
  },
  previewUnit: {
    color: colors.muted,
    fontSize: 11,
    marginLeft: 4
  },
  feedbackBanner: {
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
    padding: 8
  },
  feedbackSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1
  },
  feedbackError: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600'
  },
  feedbackTextSuccess: {
    color: '#15803d'
  },
  feedbackTextError: {
    color: '#b91c1c'
  },
  submitBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 10
  },
  submitBtnDisabled: {
    backgroundColor: colors.muted,
    opacity: 0.6
  },
  submitBtnText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800'
  },
  listContent: {
    padding: spacing.md
  },
  productCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  productCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5
  },
  productMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  productIconWrap: {
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 40
  },
  productIconWrapLow: {
    backgroundColor: '#fffbeb'
  },
  productDetails: {
    flex: 1,
    marginRight: spacing.sm
  },
  productName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  productMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  stockColumn: {
    alignItems: 'flex-end',
    gap: 6
  },
  stockPill: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  stockPillLow: {
    backgroundColor: '#fef3c7'
  },
  stockPillText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700'
  },
  stockPillTextLow: {
    color: '#b45309'
  },
  actionTag: {
    backgroundColor: '#f0fdfa',
    borderColor: colors.primary,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  actionTagSelected: {
    backgroundColor: colors.primary
  },
  actionTagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  actionTagTextSelected: {
    color: colors.surface
  }
});

export default StockReceiveScreen;
