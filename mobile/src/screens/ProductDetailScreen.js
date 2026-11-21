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
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Package,
  Layers,
  Share2,
  Sparkles,
  Tag,
  XCircle
} from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { productService } from '../api/services';
import Screen from '../components/Screen';
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
    navigation.navigate('QuotationForm', { selectedProduct: product }, { merge: true, pop: true });
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
      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle} numberOfLines={1}>
          {product.brandName || 'Product Details'}
        </Text>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareBtn}
          accessibilityLabel="Share product"
        >
          <Share2 color={colors.primary} size={20} />
        </TouchableOpacity>
      </View>

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
              <Package color={colors.muted} size={48} />
              <Text style={styles.noImageText}>Product Photo</Text>
            </View>
          )}

          {/* Availability & Featured Badges */}
          <View style={styles.floatingBadges}>
            {product.isFeatured ? (
              <View style={[styles.pillBadge, { backgroundColor: '#fef3c7' }]}>
                <Sparkles color="#b45309" size={12} />
                <Text style={[styles.pillBadgeText, { color: '#92400e' }]}>Featured</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.pillBadge,
                { backgroundColor: product.isAvailable !== false ? '#ecfdf5' : '#f1f5f9' }
              ]}
            >
              {product.isAvailable !== false ? (
                <CheckCircle2 color="#047857" size={12} />
              ) : (
                <XCircle color="#64748b" size={12} />
              )}
              <Text
                style={[
                  styles.pillBadgeText,
                  { color: product.isAvailable !== false ? '#065f46' : '#475569' }
                ]}
              >
                {product.isAvailable !== false ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>
        </View>

        {/* Title & Brand Section */}
        <View style={styles.sectionCard}>
          <View style={styles.tagsRow}>
            {product.brandName ? (
              <View style={styles.brandTag}>
                <Tag color={colors.primary} size={12} />
                <Text style={styles.brandTagText}>{product.brandName}</Text>
              </View>
            ) : null}
            {product.categoryName ? (
              <View style={styles.categoryTag}>
                <Layers color="#475569" size={12} />
                <Text style={styles.categoryTagText}>{product.categoryName}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productSku}>SKU: {product.sku}</Text>

          {/* Pricing Row */}
          <View style={styles.pricingRow}>
            <View>
              <Text style={styles.priceLabel}>Selling Price</Text>
              <Text style={styles.sellingPrice}>{formatMoney(product.sellingPrice)}</Text>
            </View>
            {product.mrp && Number(product.mrp) > Number(product.sellingPrice) ? (
              <View style={styles.mrpContainer}>
                <Text style={styles.priceLabel}>MRP</Text>
                <Text style={styles.mrpText}>{formatMoney(product.mrp)}</Text>
              </View>
            ) : null}
            <View style={styles.stockContainer}>
              <Text style={styles.priceLabel}>Stock Status</Text>
              <Text
                style={[
                  styles.stockBadgeText,
                  { color: inStock ? (isLowStock ? '#b45309' : '#047857') : '#dc2626' }
                ]}
              >
                {inStock
                  ? `${product.stockQuantity} ${product.unit || 'Piece'}${isLowStock ? ' (Low)' : ''}`
                  : 'Out of Stock'}
              </Text>
            </View>
          </View>
        </View>

        {/* Multi-Variant Selector (Color & Size Matrix) */}
        {variants.length > 1 ? (
          <View style={styles.sectionCard}>
            <View style={styles.variantHeader}>
              <Text style={styles.sectionTitle}>Model Variants ({variants.length})</Text>
              {loadingVariants ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            </View>
            <Text style={styles.variantSubtitle}>Tap a size or finish to switch variant:</Text>

            <View style={styles.chipsContainer}>
              {variants.map((v) => {
                const isSelected = v.id === product.id;
                const label = (v.size && v.size !== '--' ? v.size : '')
                  || (v.color && v.color !== '--' ? v.color : '')
                  || v.sku;

                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => handleSelectVariant(v)}
                    activeOpacity={0.7}
                    style={[
                      styles.variantChip,
                      isSelected ? styles.variantChipSelected : styles.variantChipDefault
                    ]}
                  >
                    <Text
                      style={[
                        styles.variantChipText,
                        isSelected ? styles.variantChipTextSelected : styles.variantChipTextDefault
                      ]}
                    >
                      {label} · {formatMoney(v.sellingPrice || v.mrp)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Specifications Grid */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Technical Specifications</Text>

          <View style={styles.specsList}>
            {product.size && product.size !== '--' ? (
              <SpecRow label="Dimensions / Size" value={product.size} />
            ) : null}
            {product.material && product.material !== '--' ? (
              <SpecRow label="Material / Finish" value={product.material} />
            ) : null}
            {product.color && product.color !== '--' ? (
              <SpecRow label="Color" value={product.color} />
            ) : null}
            {product.hsnCode && product.hsnCode !== '--' ? (
              <SpecRow label="HSN Code" value={product.hsnCode} />
            ) : null}
            {product.itemCode && product.itemCode !== '--' ? (
              <SpecRow label="Item Code" value={product.itemCode} />
            ) : null}
            {product.materialCode && product.materialCode !== '--' ? (
              <SpecRow label="Material Code" value={product.materialCode} />
            ) : null}
            {product.barcode ? (
              <SpecRow label="Barcode" value={product.barcode} />
            ) : null}
            {product.reorderLevel != null ? (
              <SpecRow label="Reorder Level" value={`${product.reorderLevel} ${product.unit || 'Piece'}`} />
            ) : null}
          </View>

          {product.description && product.description !== '--' ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Product Details</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={styles.footerBar}>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareActionButton}
          activeOpacity={0.8}
        >
          <Share2 color={colors.primary} size={18} />
          <Text style={styles.shareActionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAddToQuotation}
          style={styles.quoteActionButton}
          activeOpacity={0.8}
        >
          <FileSpreadsheet color="#ffffff" size={18} />
          <Text style={styles.quoteActionText}>Add to Quotation</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const SpecRow = ({ label, value }) => (
  <View style={styles.specRow}>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={styles.specValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  appBar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  backBtn: {
    padding: 6
  },
  appBarTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12
  },
  shareBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 8
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 90
  },
  imageBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 240,
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative'
  },
  productImg: {
    height: '90%',
    width: '90%'
  },
  noImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  noImageText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6
  },
  floatingBadges: {
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
    left: 12,
    position: 'absolute'
  },
  pillBadge: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm
  },
  brandTag: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  brandTagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  categoryTag: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  categoryTagText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600'
  },
  productName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24
  },
  productSku: {
    color: colors.muted,
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 4
  },
  pricingRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md
  },
  priceLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  sellingPrice: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2
  },
  mrpContainer: {
    alignItems: 'center'
  },
  mrpText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    textDecorationLine: 'line-through'
  },
  stockContainer: {
    alignItems: 'flex-end'
  },
  stockBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2
  },
  variantHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  variantSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.sm,
    marginTop: 2
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.xs
  },
  variantChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  variantChipDefault: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border
  },
  variantChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  variantChipText: {
    fontSize: 12,
    fontWeight: '600'
  },
  variantChipTextDefault: {
    color: colors.text
  },
  variantChipTextSelected: {
    color: '#ffffff',
    fontWeight: '800'
  },
  specsList: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.xs
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  specLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500'
  },
  specValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right'
  },
  descriptionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginTop: spacing.md,
    padding: spacing.md
  },
  descriptionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  descriptionText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  footerBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    left: 0,
    padding: 16,
    position: 'absolute',
    right: 0
  },
  shareActionButton: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  shareActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700'
  },
  quoteActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12
  },
  quoteActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  }
});

export default ProductDetailScreen;
