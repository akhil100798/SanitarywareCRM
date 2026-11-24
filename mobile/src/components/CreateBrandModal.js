import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { X } from 'lucide-react-native';
import AppTextInput from './AppTextInput';
import FormErrorBanner from './FormErrorBanner';
import { brandService } from '../api/services';
import { getErrorMessage } from '../api/client';
import { colors } from '../theme/colors';

const CreateBrandModal = ({ visible, onClose, onSuccess, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Brand name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        isActive: true
      };

      const created = await brandService.create(payload);
      resetForm();
      const callback = onSuccess || onCreated;
      if (callback) {
        callback(created);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>New Brand</Text>
              <Text style={styles.subtitle}>Register brand for catalog management</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <FormErrorBanner message={error} />

            <AppTextInput
              label="Brand Name *"
              placeholder="e.g. Kohler Premium or Ashirwad Pipes"
              value={name}
              onChangeText={setName}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <AppTextInput
              label="Description / Category Focus"
              placeholder="e.g. Luxury sanitaryware, faucets and CPVC fittings"
              value={description}
              onChangeText={setDescription}
              multiline={true}
            />

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelBtn} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitText}>Create Brand</Text>
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
    paddingVertical: 6
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

export default CreateBrandModal;
