import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { FileText, UploadCloud, X, CheckCircle2 } from 'lucide-react-native';
import { brandService } from '../api/services';
import { getErrorMessage } from '../api/client';
import { colors } from '../theme/colors';

const VENDOR_CATALOGS = [
  {
    id: 'ashirwad',
    name: 'Ashirwad CPVC & Fixtures Catalogue',
    fileName: '[Split] DOC-20260724-WA0015.pdf',
    size: '9.4 MB',
    type: 'Sanitary & CPVC Pipes'
  },
  {
    id: 'parryware',
    name: 'Parryware 2026 Sanitaryware Pricelist',
    fileName: 'Parryware Aug 26 Pricelist Searchable.pdf',
    size: '153.3 MB',
    type: 'Water Closets & Faucets'
  },
  {
    id: 'johnson',
    name: 'Johnson Bath Division Pricelist (June Edition)',
    fileName: 'Final JBD Pricelist June Edition.pdf',
    size: '129.2 MB',
    type: 'Luxury Sanitaryware'
  }
];

const AttachCatalogModal = ({ visible, brandId, brandName, onClose, onSuccess }) => {
  const [selectedCatalog, setSelectedCatalog] = useState(VENDOR_CATALOGS[0]);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const handleAttach = async () => {
    try {
      setLoading(true);
      setProgressMsg('Uploading & attaching catalog PDF to ' + brandName + '...');

      // Build formData
      const formData = new FormData();
      if (Platform.OS === 'web') {
        // Mock blob or file
        const blob = new Blob(['%PDF-1.4 Mock catalog content'], { type: 'application/pdf' });
        formData.append('file', blob, selectedCatalog.fileName);
      } else {
        // Native Android: use the file from app external files storage
        formData.append('file', {
          uri: 'file:///sdcard/Android/data/com.sanitarywarecrm/files/catalog_ashirwad.pdf',
          name: selectedCatalog.fileName.replace(/[^\x00-\x7F]/g, '') || 'catalog.pdf',
          type: 'application/pdf'
        });
      }

      const res = await brandService.attachCatalog(brandId, formData);
      Alert.alert(
        'Catalog Attached',
        `${selectedCatalog.name} successfully linked to ${brandName}. Version history updated.`
      );
      onSuccess(res);
      onClose();
    } catch (err) {
      Alert.alert('Upload Error', getErrorMessage(err));
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Attach Vendor Catalog</Text>
              <Text style={styles.subtitle}>Select catalog PDF for {brandName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={loading}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>Available Catalogs in Products Folder:</Text>

            {VENDOR_CATALOGS.map((cat) => {
              const isSelected = selectedCatalog.id === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catalogCard, isSelected && styles.catalogCardSelected]}
                  onPress={() => setSelectedCatalog(cat)}
                  activeOpacity={0.8}
                >
                  <View style={styles.catalogTop}>
                    <FileText color={isSelected ? colors.primary : colors.muted} size={22} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.catalogName, isSelected && styles.catalogNameSelected]}>
                        {cat.name}
                      </Text>
                      <Text style={styles.catalogMeta}>
                        {cat.fileName} • {cat.size}
                      </Text>
                      <Text style={styles.catalogType}>{cat.type}</Text>
                    </View>
                    {isSelected && <CheckCircle2 color={colors.primary} size={20} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            {loading && (
              <View style={styles.progressBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.progressText}>{progressMsg}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAttach}
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <UploadCloud size={16} color="#ffffff" />
                  <Text style={styles.submitText}>Attach Catalog</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '85%',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: 14,
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2
  },
  closeBtn: {
    padding: 6
  },
  scroll: {
    paddingVertical: 4
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.4
  },
  catalogCard: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10
  },
  catalogCardSelected: {
    backgroundColor: '#f0fdfa',
    borderColor: colors.primary,
    borderWidth: 1.5
  },
  catalogTop: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  catalogName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text
  },
  catalogNameSelected: {
    color: colors.primaryDark
  },
  catalogMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2
  },
  catalogType: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 10
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    flex: 1
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 8
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.muted
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnDisabled: {
    opacity: 0.6
  },
  submitText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff'
  }
});

export default AttachCatalogModal;
