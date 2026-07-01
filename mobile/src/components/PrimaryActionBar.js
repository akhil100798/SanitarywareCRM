import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const PrimaryActionBar = ({ label, onPress, disabled, loading, secondaryLabel, onSecondaryPress }) => (
  <View style={styles.bar}>
    {secondaryLabel ? (
      <Pressable style={styles.secondaryButton} onPress={onSecondaryPress} disabled={disabled || loading}>
        <Text style={styles.secondaryText}>{secondaryLabel}</Text>
      </Pressable>
    ) : null}
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && !disabled && styles.pressed,
        (disabled || loading) && styles.disabled
      ]}
    >
      {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48
  },
  primaryText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800'
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '800'
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.82
  }
});

export default PrimaryActionBar;
