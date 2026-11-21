import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
let ImagePicker = {
  requestCameraPermissionsAsync: async () => ({ status: 'granted' }),
  launchCameraAsync: async () => ({ canceled: true }),
  requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted' }),
  launchImageLibraryAsync: async () => ({ canceled: true })
};
try {
  // eslint-disable-next-line global-require
  const picker = require('expo-image-picker');
  if (picker) ImagePicker = picker;
} catch {
  // Native ExponentImagePicker module not linked in release APK
}
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { quotationService } from '../api/services';
import { colors } from '../theme/colors';
import { formatMoney } from '../utils/formatters';
import { SAMPLE_CONTRACTOR_NOTE_B64 } from '../utils/sampleContractorNote';

export const ContractorNoteScannerModal = ({ visible, onClose, onApplyItems }) => {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [ocrResult, setOcrResult] = useState(null);
  const [items, setItems] = useState([]);
  const [replaceMode, setReplaceMode] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const resetState = () => {
    setSelectedAsset(null);
    setProcessing(false);
    setError('');
    setOcrResult(null);
    setItems([]);
    setExpandedRow(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processImage = async (asset) => {
    setSelectedAsset(asset);
    setError('');
    setProcessing(true);
    setOcrResult(null);

    try {
      const data = await quotationService.importContractorNote(asset);
      setOcrResult(data);
      const parsedItems = (data.items || []).map((item, idx) => ({
        id: `ocr-${idx}`,
        selected: item.matchStatus === 'EXACT_MATCH' || item.matchStatus === 'FUZZY_MATCH',
        matchStatus: item.matchStatus,
        rawText: item.rawText,
        requestedQuantity: item.requestedQuantity || 1,
        matchedProductId: item.matchedProductId,
        matchedProductName: item.matchedProductName,
        matchedProductSku: item.matchedProductSku,
        brandName: item.brandName,
        unitPrice: item.unitPrice,
        candidateOptions: item.candidateOptions || []
      }));
      setItems(parsedItems);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera permission is required to photograph contractor notes.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85
      });

      if (!result.canceled && result.assets?.[0]) {
        await processImage(result.assets[0]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Gallery access is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85
      });

      if (!result.canceled && result.assets?.[0]) {
        await processImage(result.assets[0]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleUseSample = async () => {
    try {
      const sampleAsset = {
        uri: SAMPLE_CONTRACTOR_NOTE_B64,
        fileName: 'contractor-estimate-note.png',
        mimeType: 'image/png'
      };
      await processImage(sampleAsset);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const toggleItemSelection = (index) => {
    setItems((curr) => {
      const next = [...curr];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const changeQuantity = (index, delta) => {
    setItems((curr) => {
      const next = [...curr];
      const newQty = Math.max(1, (next[index].requestedQuantity || 1) + delta);
      next[index] = { ...next[index], requestedQuantity: newQty };
      return next;
    });
  };

  const selectCandidate = (itemIndex, candidate) => {
    setItems((curr) => {
      const next = [...curr];
      next[itemIndex] = {
        ...next[itemIndex],
        matchedProductId: candidate.productId,
        matchedProductName: candidate.name,
        matchedProductSku: candidate.sku,
        unitPrice: candidate.sellingPrice,
        matchStatus: 'EXACT_MATCH',
        selected: true
      };
      return next;
    });
    setExpandedRow(null);
  };

  const handleApply = () => {
    const selected = items.filter((i) => i.selected && i.matchedProductId);
    if (!selected.length) {
      setError('Please select at least one matched product item to import.');
      return;
    }
    onApplyItems(selected, replaceMode);
    handleClose();
  };

  const selectedCount = items.filter((i) => i.selected && i.matchedProductId).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIcon}>
                <Camera color="#fff" size={18} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Scan Contractor Note</Text>
                <Text style={styles.headerSubtitle}>Tesseract OCR & Catalog Matcher</Text>
              </View>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X color={colors.muted} size={20} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorBanner}>
                <AlertCircle color={colors.danger} size={18} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Step 1: Capture or Choose Photo */}
            {!selectedAsset && !processing ? (
              <View style={styles.introBox}>
                <View style={styles.introIconWrap}>
                  <Sparkles color={colors.primary} size={32} />
                </View>
                <Text style={styles.introTitle}>Digitize Handwritten Notes</Text>
                <Text style={styles.introDescription}>
                  Photograph a plumber estimate slip, handwritten contractor note, or scanned bill.
                  Our OCR engine will extract line items, autocorrect optical noise, and match
                  products with current warehouse prices.
                </Text>

                <View style={styles.buttonStack}>
                  <Pressable style={styles.primaryActionButton} onPress={handleLaunchCamera}>
                    <Camera color="#fff" size={20} />
                    <Text style={styles.primaryActionText}>Take Photo with Camera</Text>
                  </Pressable>

                  <Pressable style={styles.secondaryActionButton} onPress={handleLaunchGallery}>
                    <ImageIcon color={colors.primary} size={20} />
                    <Text style={styles.secondaryActionText}>Choose from Photo Gallery</Text>
                  </Pressable>

                  <Pressable style={styles.sampleButton} onPress={handleUseSample}>
                    <FileText color={colors.muted} size={16} />
                    <Text style={styles.sampleButtonText}>Load Test Contractor Note</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Processing State */}
            {processing ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.loadingTitle}>Analyzing Contractor Note...</Text>
                <Text style={styles.loadingSubtitle}>
                  Running Tesseract OCR, resolving optical character variations, and matching catalog
                  SKUs.
                </Text>
              </View>
            ) : null}

            {/* Step 2: Review OCR Extracted Items */}
            {!processing && ocrResult ? (
              <View style={styles.resultsContainer}>
                {/* Photo summary thumbnail */}
                {selectedAsset?.uri ? (
                  <View style={styles.previewRow}>
                    <Image source={{ uri: selectedAsset.uri }} style={styles.thumbnail} />
                    <View style={styles.previewMeta}>
                      <Text style={styles.previewName} numberOfLines={1}>
                        {selectedAsset.fileName || 'Contractor Estimate Note'}
                      </Text>
                      <Text style={styles.previewStats}>
                        {ocrResult.matchedCount} Exact • {ocrResult.fuzzyCount} Suggestions •{' '}
                        {ocrResult.unmatchedCount} Unmatched
                      </Text>
                      <Pressable
                        style={styles.retakeInline}
                        onPress={() => {
                          resetState();
                        }}
                      >
                        <RefreshCw color={colors.primary} size={12} />
                        <Text style={styles.retakeText}>Retake / Pick Other</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {/* Strategy Mode Toggle */}
                <View style={styles.modeToggleRow}>
                  <Pressable
                    style={[styles.modeTab, !replaceMode && styles.modeTabActive]}
                    onPress={() => setReplaceMode(false)}
                  >
                    <Text style={[styles.modeTabText, !replaceMode && styles.modeTabTextActive]}>
                      Append to Items
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modeTab, replaceMode && styles.modeTabActive]}
                    onPress={() => setReplaceMode(true)}
                  >
                    <Text style={[styles.modeTabText, replaceMode && styles.modeTabTextActive]}>
                      Replace Quote Items
                    </Text>
                  </Pressable>
                </View>

                {/* Items List */}
                <Text style={styles.sectionHeader}>Extracted Line Items ({items.length})</Text>

                {items.length === 0 ? (
                  <View style={styles.emptyItemsBox}>
                    <Text style={styles.emptyItemsText}>
                      No sanitaryware items recognized on this note. Try taking a clearer photo.
                    </Text>
                  </View>
                ) : (
                  items.map((item, idx) => {
                    const isExact = item.matchStatus === 'EXACT_MATCH';
                    const isFuzzy = item.matchStatus === 'FUZZY_MATCH';
                    const isExpanded = expandedRow === idx;

                    return (
                      <View key={item.id} style={styles.itemCard}>
                        {/* Item top line */}
                        <View style={styles.itemHeader}>
                          <Pressable
                            style={[styles.checkbox, item.selected && styles.checkboxSelected]}
                            onPress={() => toggleItemSelection(idx)}
                          >
                            {item.selected ? <Check color="#fff" size={14} /> : null}
                          </Pressable>

                          <View style={styles.itemTitleBlock}>
                            <View style={styles.badgeRow}>
                              <View
                                style={[
                                  styles.statusBadge,
                                  isExact
                                    ? styles.badgeExact
                                    : isFuzzy
                                    ? styles.badgeFuzzy
                                    : styles.badgeUnmatched
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.badgeText,
                                    isExact
                                    ? styles.badgeTextExact
                                    : isFuzzy
                                    ? styles.badgeTextFuzzy
                                    : styles.badgeTextUnmatched
                                  ]}
                                >
                                  {isExact ? 'Exact Match' : isFuzzy ? 'Suggestion' : 'Unmatched'}
                                </Text>
                              </View>
                              {item.brandName ? (
                                <Text style={styles.itemBrand}>{item.brandName}</Text>
                              ) : null}
                            </View>

                            <Text style={styles.productName}>
                              {item.matchedProductName || 'Unknown SKU / Unmatched Item'}
                            </Text>
                            {item.matchedProductSku ? (
                              <Text style={styles.productSku}>SKU: {item.matchedProductSku}</Text>
                            ) : null}
                            <Text style={styles.rawText}>OCR Text: "{item.rawText}"</Text>
                          </View>
                        </View>

                        {/* Quantity and Price */}
                        {item.matchedProductId ? (
                          <View style={styles.itemFooter}>
                            <View style={styles.qtyControl}>
                              <Text style={styles.qtyLabel}>Qty:</Text>
                              <Pressable
                                style={styles.qtyBtn}
                                onPress={() => changeQuantity(idx, -1)}
                              >
                                <Minus color={colors.text} size={14} />
                              </Pressable>
                              <Text style={styles.qtyValue}>{item.requestedQuantity}</Text>
                              <Pressable
                                style={styles.qtyBtn}
                                onPress={() => changeQuantity(idx, 1)}
                              >
                                <Plus color={colors.text} size={14} />
                              </Pressable>
                            </View>

                            <View style={styles.priceWrap}>
                              <Text style={styles.unitPrice}>
                                @ {formatMoney(item.unitPrice || 0)}
                              </Text>
                              <Text style={styles.lineTotal}>
                                {formatMoney((item.unitPrice || 0) * (item.requestedQuantity || 1))}
                              </Text>
                            </View>
                          </View>
                        ) : null}

                        {/* Candidates Alternative Selector */}
                        {item.candidateOptions?.length > 1 ? (
                          <View style={styles.candidatesBlock}>
                            <Pressable
                              style={styles.candidateToggle}
                              onPress={() => setExpandedRow(isExpanded ? null : idx)}
                            >
                              <Text style={styles.candidateToggleText}>
                                {item.candidateOptions.length} catalog options available
                              </Text>
                              {isExpanded ? (
                                <ChevronUp color={colors.primary} size={14} />
                              ) : (
                                <ChevronDown color={colors.primary} size={14} />
                              )}
                            </Pressable>

                            {isExpanded ? (
                              <View style={styles.candidatesList}>
                                {item.candidateOptions.map((c) => (
                                  <Pressable
                                    key={c.productId}
                                    style={[
                                      styles.candidateRow,
                                      item.matchedProductId === c.productId &&
                                        styles.candidateRowSelected
                                    ]}
                                    onPress={() => selectCandidate(idx, c)}
                                  >
                                    <View style={styles.candidateMeta}>
                                      <Text style={styles.candidateName}>{c.name}</Text>
                                      <Text style={styles.candidateSku}>
                                        {c.sku} • {formatMoney(c.sellingPrice)}
                                      </Text>
                                    </View>
                                    {item.matchedProductId === c.productId ? (
                                      <CheckCircle2 color={colors.primary} size={16} />
                                    ) : null}
                                  </Pressable>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Actions */}
          {!processing && ocrResult && items.length > 0 ? (
            <View style={styles.footer}>
              <Pressable style={styles.applyButton} onPress={handleApply}>
                <Check color="#fff" size={18} />
                <Text style={styles.applyButtonText}>
                  Import {selectedCount} {selectedCount === 1 ? 'Item' : 'Items'} into Quotation
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted
  },
  closeButton: {
    padding: 6
  },
  bodyContent: {
    padding: 20
  },
  introBox: {
    alignItems: 'center',
    paddingVertical: 20
  },
  introIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center'
  },
  introDescription: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 12
  },
  buttonStack: {
    width: '100%',
    gap: 12
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700'
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6
  },
  sampleButtonText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600'
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center'
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 6
  },
  loadingSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 24
  },
  resultsContainer: {
    width: '100%'
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#e2e8f0'
  },
  previewMeta: {
    flex: 1,
    marginLeft: 12
  },
  previewName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  previewStats: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2
  },
  retakeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  modeTabActive: {
    backgroundColor: colors.surface
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted
  },
  modeTabTextActive: {
    color: colors.text,
    fontWeight: '700'
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  emptyItemsBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12
  },
  emptyItemsText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center'
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  itemTitleBlock: {
    flex: 1
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  badgeExact: {
    backgroundColor: '#dcfce7'
  },
  badgeFuzzy: {
    backgroundColor: '#fef3c7'
  },
  badgeUnmatched: {
    backgroundColor: '#fee2e2'
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  badgeTextExact: {
    color: '#15803d'
  },
  badgeTextFuzzy: {
    color: '#b45309'
  },
  badgeTextUnmatched: {
    color: '#b91c1c'
  },
  itemBrand: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  productSku: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2
  },
  rawText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 2
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  qtyLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600'
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    minWidth: 20,
    textAlign: 'center'
  },
  priceWrap: {
    alignItems: 'flex-end'
  },
  unitPrice: {
    fontSize: 11,
    color: colors.muted
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary
  },
  candidatesBlock: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6
  },
  candidateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  candidateToggleText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600'
  },
  candidatesList: {
    marginTop: 6,
    gap: 6
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border
  },
  candidateRowSelected: {
    borderColor: colors.primary,
    backgroundColor: '#f0fdf4'
  },
  candidateMeta: {
    flex: 1
  },
  candidateName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
  },
  candidateSku: {
    fontSize: 11,
    color: colors.muted
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  }
});

export default ContractorNoteScannerModal;
