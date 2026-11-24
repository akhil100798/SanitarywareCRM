import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  Calendar,
  Download,
  FileText,
  History,
  Tag,
  UploadCloud
} from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { brandService } from '../api/services';
import AppHeader from '../components/AppHeader';
import AttachCatalogModal from '../components/AttachCatalogModal';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { ErrorView, LoadingView } from '../components/StateViews';
import { colors, spacing } from '../theme/colors';

const BrandDetailScreen = ({ route, navigation }) => {
  const { id } = route.params || {};
  const [brand, setBrand] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [error, setError] = useState('');

  const loadBrand = useCallback(async (brandId) => {
    try {
      setLoading(true);
      setError('');
      const data = await brandService.getById(brandId);
      setBrand(data);

      setLoadingVersions(true);
      try {
        const verList = await brandService.getCatalogVersions(brandId);
        setVersions(verList || []);
      } catch {
        setVersions([]);
      } finally {
        setLoadingVersions(false);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadBrand(id);
    }
  }, [id, loadBrand]);

  const handleOpenPdf = async () => {
    if (!brand?.catalogFileName) {
      Alert.alert('No Catalog', 'No catalog PDF is currently attached to this brand.');
      return;
    }
    const downloadUrl = `${API_BASE_URL}/brands/${brand.id}/catalog`;
    try {
      const canOpen = await Linking.canOpenURL(downloadUrl);
      if (canOpen) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Cannot Open URL', `Unable to open: ${downloadUrl}`);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) return <LoadingView label="Loading brand details..." />;
  if (error || !brand) return <ErrorView message={error || 'Brand not found'} onRetry={() => loadBrand(id)} />;

  return (
    <Screen padded={false}>
      <AppHeader
        title={brand.name}
        subtitle="Catalog & Brand Portfolio"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Summary Card */}
        <View style={styles.sectionCard}>
          <View style={styles.brandHeader}>
            <View style={styles.brandIconWrap}>
              <Tag color={colors.primary} size={24} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>{brand.name}</Text>
              <View style={styles.statusRow}>
                <StatusPill
                  label={brand.isActive ? 'Active' : 'Inactive'}
                  type={brand.isActive ? 'success' : 'danger'}
                  size="sm"
                />
              </View>
            </View>
          </View>

          {brand.description ? (
            <Text style={styles.brandDescription}>{brand.description}</Text>
          ) : null}
        </View>

        {/* Attached Catalog PDF Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Attached Catalog PDF</Text>
            <FileText color={colors.primary} size={18} />
          </View>

          {brand.catalogFileName ? (
            <View style={styles.catalogBox}>
              <View style={styles.catalogInfo}>
                <FileText color={colors.muted} size={22} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.catalogFileName} numberOfLines={2}>
                    {brand.catalogFileName}
                  </Text>
                  <Text style={styles.catalogSubtitle}>Ready for download & viewing</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={handleOpenPdf}
                  style={[styles.downloadButton, { flex: 1 }]}
                  activeOpacity={0.8}
                >
                  <Download color={colors.white} size={15} />
                  <Text style={styles.downloadButtonText}>Open PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowAttachModal(true)}
                  style={[styles.downloadButton, { flex: 1, backgroundColor: colors.primaryDark }]}
                  activeOpacity={0.8}
                >
                  <UploadCloud color={colors.white} size={15} />
                  <Text style={styles.downloadButtonText}>Update Catalog</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCatalogBox}>
              <Text style={styles.emptyCatalogText}>No catalog PDF attached to this brand yet.</Text>
              <TouchableOpacity
                onPress={() => setShowAttachModal(true)}
                style={[styles.downloadButton, { marginTop: 12, backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <UploadCloud color={colors.white} size={15} />
                <Text style={styles.downloadButtonText}>Attach Vendor Catalog</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Catalog Versions & Price History */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Version History ({versions.length})</Text>
            <History color={colors.primary} size={18} />
          </View>

          {loadingVersions ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
          ) : versions.length === 0 ? (
            <Text style={styles.noVersionsText}>No catalog versions recorded yet.</Text>
          ) : (
            <View style={styles.versionList}>
              {versions.map((ver) => (
                <View key={ver.id} style={styles.versionItem}>
                  <View style={styles.versionTop}>
                    <Text style={styles.versionTag}>{ver.versionTag}</Text>
                    <StatusPill
                      label={ver.status}
                      type={ver.status === 'ACTIVE' ? 'success' : 'neutral'}
                      size="sm"
                    />
                  </View>

                  <View style={styles.versionMetaRow}>
                    <View style={styles.metaCol}>
                      <Calendar color={colors.muted} size={12} />
                      <Text style={styles.versionDate}>
                        {new Date(ver.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.versionStats}>
                      {ver.totalProducts} prods (+{ver.createdCount} new, ~{ver.updatedCount} revised)
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <AttachCatalogModal
        visible={showAttachModal}
        brandId={brand.id}
        brandName={brand.name}
        onClose={() => setShowAttachModal(false)}
        onSuccess={(updated) => {
          setBrand(updated);
          loadBrand(brand.id);
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  brandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  brandIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  brandTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  statusRow: {
    marginTop: 4
  },
  brandDescription: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
    paddingTop: spacing.sm
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  catalogBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing.md
  },
  catalogInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.md
  },
  catalogFileName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  catalogSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  downloadButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 9
  },
  downloadButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800'
  },
  emptyCatalogBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md
  },
  emptyCatalogText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center'
  },
  noVersionsText: {
    color: colors.muted,
    fontSize: 12,
    paddingVertical: 8,
    textAlign: 'center'
  },
  versionList: {
    gap: 8,
    marginTop: 4
  },
  versionItem: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  versionTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  versionTag: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    flex: 1
  },
  versionMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  metaCol: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4
  },
  versionDate: {
    color: colors.muted,
    fontSize: 11
  },
  versionStats: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700'
  }
});

export default BrandDetailScreen;
