import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  FileSpreadsheet,
  Package,
  Layers,
  Share2,
  Tag
} from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { productService } from '../api/services';
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { ErrorView, LoadingView } from '../components/StateViews';
import { colors, spacing } from '../theme/colors';
import { formatMoney } from '../utils/formatters';

const ProductDetailScreen = ({ route, navigation }) => {
  const { id } = route.params || {};
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  const loadProduct = useCallback(async (productId) => {
    try {
      setLoading(true);
      setError('');
      setImageFailed(false);
      const data = await productService.getById(productId);
      setProduct(data);

      // Fetch sibling variants
      if (data.brandId && data.name) {
        setLoadingVariants(true);
        try {
          const siblings = await productService.getVariantsByModel(data.brandId, data.name);
          setVariants(siblings);
        } catch {
          setVariants([data]);
        } finally {
          setLoadingVariants(false);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id, loadProduct]);

  const handleSelectVariant = (variant) => {
    if (variant.id === product?.id) return;
    setProduct(variant);
    setImageFailed(false);
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      const shareText = `*${product.name}*\n`
        + `Brand: ${product.brandName || '--'}\n`
        + `SKU: ${product.sku}\n`
        + (product.size && product.size !== '--' ? `Size: ${product.size}\n` : '')
        + (product.color ? `Color/Finish: ${product.color}\n` : '')
        + `MRP: ${formatMoney(product.mrp)}\n`
        + `Selling Price: ${formatMoney(product.sellingPrice)}\n`
        + `Stock: ${product.stockQuantity ?? 0} ${product.unit || 'Piece'}\n`
        + (product.hsnCode ? `HSN: ${product.hsnCode}\n` : '')
        + (product.description && product.description !== '--' ? `\nDetails: ${product.description}` : '');

      await Share.share({
        title: product.name,
        message: shareText
      });
    } catch (err) {
      Alert.alert('Share Failed', err.message);
    }
  };

  const handleAddToQuotation = () => {
    if (!product) return;
    navigation.navigate('QuotationForm', { selectedProduct: product });
  };

  if (loading) return <LoadingView label="Loading product specifications..." />;
  if (error || !product) return <ErrorView message={error || 'Product not found'} onRetry={() => loadProduct(id)} />;

  const primaryImage = product.images?.find((img) => img.isPrimary)?.imageUrl
    || product.images?.[0]?.imageUrl
    || product.imageUrls?.[0];

  const inStock = Number(product.stockQuantity || 0) > 0;
  const isLowStock = inStock && Number(product.stockQuantity || 0) <= Number(product.reorderLevel || 10);

  return (
    <Screen padded={false}>
      <AppHeader
        title={product.brandName || 'Product Details'}
        subtitle={product.name}
        onBack={() => navigation.goBack()}
        rightIcon={Share2}
        onRightPress={handleShare}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product Image Area */}
        <View style={styles.imageBox}>
          {primaryImage && !imageFailed ? (
            <Image
              source={{ uri: primaryImage }}
              style={styles.productImg}
              resizeMode="contain"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Package color={colors.primary} size={48} strokeWidth={1.8} />
              <Text style={styles.noImageText}>Product Fixture Photo</Text>
            </View>
          )}

          {/* Availability & Featured Badges */}
          <View style={styles.floatingBadges}>
            {product.isFeatured ? (
              <StatusPill label="Featured" type="warning" size="sm" />
            ) : null}
            <StatusPill
              label={product.isAvailable !== false ? 'Catalog Active' : 'Unavailable'}
              type={product.isAvailable !== false ? 'success' : 'neutral'}
              size="sm"
            />
          </View>
        </View>

        {/* Pricing & Stock Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.brandSubtitle}>
            {product.brandName || 'Sanitaryware'} {product.categoryName ? `• ${product.categoryName}` : ''}
          </Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.sellingPriceLabel}>Showroom Price</Text>
              <Text style={styles.sellingPrice}>{formatMoney(product.sellingPrice)}</Text>
            </View>
            {product.mrp ? (
              <View style={styles.mrpBox}>
                <Text style={styles.mrpLabel}>MRP</Text>
                <Text style={styles.mrpValue}>{formatMoney(product.mrp)}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.stockStatusRow}>
            <View style={styles.stockLeft}>
              <Text style={styles.stockLabel}>Available Stock:</Text>
              <Text style={styles.stockQty}>
                {product.stockQuantity ?? 0} {product.unit || 'Piece'}
              </Text>
            </View>
            <StatusPill
              label={
                !inStock
                  ? 'Out of Stock'
                  : isLowStock
                    ? 'Low Stock Alert'
                    : 'In Stock'
              }
              type={
                !inStock
                  ? 'danger'
                  : isLowStock
                    ? 'warning'
                    : 'success'
              }
              size="sm"
            />
          </View>
        </View>

        {/* Sibling Model Variants */}
        {variants.length > 1 ? (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Model Variants ({variants.length})</Text>
              <Layers color={colors.primary} size={18} />
            </View>
            {loadingVariants ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantsRow}>
                {variants.map((v) => {
                  const isCurrent = v.id === product.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => handleSelectVariant(v)}
                      style={[styles.variantChip, isCurrent && styles.variantChipSelected]}
                    >
                      <Text style={[styles.variantSku, isCurrent && styles.variantSkuSelected]}>
                        {v.sku}
                      </Text>
                      <Text style={[styles.variantDetail, isCurrent && styles.variantDetailSelected]}>
                        {v.color || v.size || formatMoney(v.sellingPrice)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : null}

        {/* Specifications Table */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Technical Specifications</Text>
            <FileSpreadsheet color={colors.primary} size={18} />
          </View>

          <View style={styles.specTable}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Model / SKU</Text>
              <Text style={styles.specValue}>{product.sku}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Brand</Text>
              <Text style={styles.specValue}>{product.brandName || '--'}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Category</Text>
              <Text style={styles.specValue}>{product.categoryName || '--'}</Text>
            </View>
            {product.size && product.size !== '--' ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Dimensions / Size</Text>
                <Text style={styles.specValue}>{product.size}</Text>
              </View>
            ) : null}
            {product.color ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Finish / Color</Text>
                <Text style={styles.specValue}>{product.color}</Text>
              </View>
            ) : null}
            {product.material ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Material</Text>
                <Text style={styles.specValue}>{product.material}</Text>
              </View>
            ) : null}
            {product.hsnCode ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>HSN Code</Text>
                <Text style={styles.specValue}>{product.hsnCode}</Text>
              </View>
            ) : null}
            {product.reorderLevel !== undefined ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Reorder Threshold</Text>
                <Text style={styles.specValue}>{product.reorderLevel} {product.unit || 'Piece'}</Text>
              </View>
            ) : null}
          </View>

          {product.description && product.description !== '--' ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Product Overview</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.footerBar}>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareActionButton}
          activeOpacity={0.8}
        >
          <Share2 color={colors.primary} size={16} />
          <Text style={styles.shareActionText}>Share Spec</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAddToQuotation}
          style={styles.quoteActionButton}
          activeOpacity={0.8}
        >
          <Tag color={colors.white} size={16} />
          <Text style={styles.quoteActionText}>Add to Quotation</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100
  },
  imageBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative'
  },
  productImg: {
    width: '90%',
    height: '90%'
  },
  noImagePlaceholder: {
    alignItems: 'center',
    gap: 8
  },
  noImageText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700'
  },
  floatingBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  productName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2
  },
  brandSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 12
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 10
  },
  sellingPriceLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  sellingPrice: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2
  },
  mrpBox: {
    alignItems: 'flex-end'
  },
  mrpLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  mrpValue: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'line-through'
  },
  stockStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  stockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  stockLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  stockQty: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  variantsRow: {
    gap: 8,
    paddingVertical: 4
  },
  variantChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  variantChipSelected: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary
  },
  variantSku: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  variantSkuSelected: {
    color: colors.primary
  },
  variantDetail: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  variantDetailSelected: {
    color: colors.primaryDark
  },
  specTable: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomColor: colors.borderLight,
    borderBottomWidth: 1,
    paddingVertical: 8
  },
  specLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  specValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  descriptionBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 12,
    padding: 10
  },
  descriptionLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  descriptionText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18
  },
  footerBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    left: 0,
    padding: 12,
    position: 'absolute',
    right: 0
  },
  shareActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  shareActionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  quoteActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12
  },
  quoteActionText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800'
  }
});

export default ProductDetailScreen;
