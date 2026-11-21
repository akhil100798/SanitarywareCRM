import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp, ExternalLink, Package } from 'lucide-react-native';
import { colors } from '../theme/colors';

const DEFAULT_FIXTURE_IMAGES = [
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=400&q=80'
];

const getBadgeColors = (badgeText) => {
  if (!badgeText) return { bg: '#f1f5f9', fg: '#475569' };
  const text = badgeText.toUpperCase();
  if (text === 'PAID' || text === 'DELIVERED' || text === 'ACCEPTED' || text === 'ACTIVE' || text === 'IN STOCK') {
    return { bg: '#ecfdf5', fg: '#047857' };
  }
  if (text === 'PENDING' || text === 'PARTIAL' || text === 'PROCESSING' || text === 'SENT' || text === 'CONFIRMED' || text === 'LOW STOCK') {
    return { bg: '#fffbeb', fg: '#b45309' };
  }
  if (text === 'UNPAID' || text === 'CANCELLED' || text === 'REJECTED' || text === 'INACTIVE' || text === 'EXPIRED' || text === 'UNAVAILABLE') {
    return { bg: '#fef2f2', fg: '#b91c1c' };
  }
  return { bg: '#f0fdfa', fg: '#0f766e' };
};

const ListCard = ({ item, onPress, onNavigateDetail }) => {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const badgeColors = getBadgeColors(item.badge);

  const handlePress = () => {
    setExpanded((prev) => !prev);
    if (onPress) {
      onPress();
    }
  };

  const handleNavigateDetail = () => {
    if (isNavigating || !onNavigateDetail) return;
    setIsNavigating(true);
    try {
      onNavigateDetail(item.id);
    } finally {
      setTimeout(() => setIsNavigating(false), 1000);
    }
  };

  const raw = item.raw || {};
  const fallbackImg = typeof item.id === 'number'
    ? DEFAULT_FIXTURE_IMAGES[Math.abs(item.id) % DEFAULT_FIXTURE_IMAGES.length]
    : DEFAULT_FIXTURE_IMAGES[0];
  const targetImageUrl = item.imageUrl || fallbackImg;
  const showImage = !imageError && Boolean(targetImageUrl);

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, expanded && styles.cardExpanded]}
    >
      {/* Top Row: Side-by-side Product Image and Details */}
      <View style={styles.compactRow}>
        {/* Left Side: Product Image Box */}
        <View style={styles.imageBox}>
          {showImage ? (
            <Image
              source={{ uri: targetImageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.placeholderBox}>
              <Package size={26} color={colors.primary} />
              <Text style={styles.placeholderLabel}>FIXTURE</Text>
            </View>
          )}
        </View>

        {/* Right Side: Product Details */}
        <View style={styles.detailsBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {item.amount ? <Text style={styles.amount}>{item.amount}</Text> : null}
          </View>

          {item.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}

          <View style={styles.footerRow}>
            {item.meta ? (
              <Text style={styles.meta} numberOfLines={1}>
                {item.meta}
              </Text>
            ) : null}

            <View style={styles.badgeWrap}>
              {item.badge ? (
                <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
                  <Text style={[styles.badgeText, { color: badgeColors.fg }]} numberOfLines={1}>
                    {item.badge}
                  </Text>
                </View>
              ) : null}
              {expanded ? (
                <ChevronUp size={16} color={colors.primary} />
              ) : (
                <ChevronDown size={16} color={colors.muted} />
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Expanded Details Section: Prominent Image and Comprehensive Info Below */}
      {expanded ? (
        <View style={styles.expandedSection}>
          <View style={styles.divider} />

          {/* Large Hero Image */}
          <View style={styles.heroImageBox}>
            {showImage ? (
              <Image
                source={{ uri: targetImageUrl }}
                style={styles.heroImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Package size={48} color={colors.primary} />
                <Text style={styles.heroPlaceholderText}>Product Fixture Image</Text>
              </View>
            )}
          </View>

          {/* Below Image: Detailed Specifications Grid */}
          <View style={styles.specsContainer}>
            <Text style={styles.expandedTitle}>{item.title}</Text>

            <View style={styles.specGrid}>
              {raw.sku || item.subtitle ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>SKU</Text>
                  <Text style={styles.specValue}>{raw.sku || item.subtitle.split('|')[0]?.trim()}</Text>
                </View>
              ) : null}

              {raw.brandName || (item.subtitle && item.subtitle.includes('|')) ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Brand</Text>
                  <Text style={styles.specValue}>{raw.brandName || item.subtitle.split('|')[1]?.trim()}</Text>
                </View>
              ) : null}

              {raw.categoryName ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Category</Text>
                  <Text style={styles.specValue}>{raw.categoryName}</Text>
                </View>
              ) : null}

              {raw.hsnCode ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>HSN Code</Text>
                  <Text style={styles.specValue}>{raw.hsnCode}</Text>
                </View>
              ) : null}

              {item.amount ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Selling Price</Text>
                  <Text style={[styles.specValue, { color: colors.primary, fontWeight: '800' }]}>{item.amount}</Text>
                </View>
              ) : null}

              {raw.mrp ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>MRP</Text>
                  <Text style={styles.specValue}>INR {raw.mrp}</Text>
                </View>
              ) : null}

              {raw.stockQuantity !== undefined ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Stock Available</Text>
                  <Text style={styles.specValue}>{raw.stockQuantity} {raw.unit || 'Piece'}</Text>
                </View>
              ) : null}

              {raw.reorderLevel !== undefined ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Reorder Alert</Text>
                  <Text style={styles.specValue}>{raw.reorderLevel} {raw.unit || 'Piece'}</Text>
                </View>
              ) : null}

              {raw.material ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Material</Text>
                  <Text style={styles.specValue}>{raw.material}</Text>
                </View>
              ) : null}

              {raw.size && raw.size !== '--' ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Dimensions / Size</Text>
                  <Text style={styles.specValue}>{raw.size}</Text>
                </View>
              ) : null}
            </View>

            {raw.description ? (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>Product Overview</Text>
                <Text style={styles.descriptionText}>{raw.description}</Text>
              </View>
            ) : null}

            {onNavigateDetail ? (
              <TouchableOpacity
                onPress={handleNavigateDetail}
                disabled={isNavigating}
                style={[styles.openDetailBtn, isNavigating && { opacity: 0.6 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.openDetailText}>Open Full Product Details</Text>
                <ExternalLink size={14} color="#ffffff" />
              </TouchableOpacity>
            ) : null}

            <View style={styles.collapseHint}>
              <ChevronUp size={14} color={colors.primary} />
              <Text style={styles.collapseHintText}>Tap card to collapse</Text>
            </View>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  cardExpanded: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#ffffff'
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }]
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  imageBox: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff'
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdfa'
  },
  placeholderLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
    letterSpacing: 0.5
  },
  detailsBlock: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between'
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1
  },
  amount: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8
  },
  meta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600'
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginTop: 12,
    marginBottom: 10
  },
  expandedSection: {
    marginTop: 4
  },
  heroImageBox: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff'
  },
  heroPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  heroPlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary
  },
  specsContainer: {
    paddingHorizontal: 2
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 10
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  specItem: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: '47%',
    flex: 1
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2
  },
  descriptionBox: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    marginBottom: 10
  },
  descriptionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  descriptionText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17
  },
  openDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8
  },
  openDetailText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  collapseHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4
  },
  collapseHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary
  }
});

export default ListCard;
