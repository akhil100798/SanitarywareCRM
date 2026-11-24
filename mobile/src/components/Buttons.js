import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

export const PrimaryButton = ({
  label,
  onPress,
  disabled,
  loading,
  icon: Icon,
  style,
  textStyle
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
    disabled={disabled || loading}
    onPress={onPress}
    style={({ pressed }) => [
      styles.primary,
      pressed && !disabled && styles.pressed,
      (disabled || loading) && styles.disabled,
      style
    ]}
  >
    {loading ? (
      <ActivityIndicator color={colors.white} size="small" />
    ) : (
      <>
        {Icon ? <Icon size={18} color={colors.white} strokeWidth={2.2} style={styles.icon} /> : null}
        <Text style={[styles.primaryText, textStyle]}>{label}</Text>
      </>
    )}
  </Pressable>
);

export const SecondaryButton = ({
  label,
  onPress,
  disabled,
  loading,
  icon: Icon,
  style,
  textStyle
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
    disabled={disabled || loading}
    onPress={onPress}
    style={({ pressed }) => [
      styles.secondary,
      pressed && !disabled && styles.pressedSecondary,
      (disabled || loading) && styles.disabled,
      style
    ]}
  >
    {loading ? (
      <ActivityIndicator color={colors.text} size="small" />
    ) : (
      <>
        {Icon ? <Icon size={18} color={colors.text} strokeWidth={2.2} style={styles.icon} /> : null}
        <Text style={[styles.secondaryText, textStyle]}>{label}</Text>
      </>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  primaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800'
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  secondaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  icon: {
    marginRight: 6
  },
  pressed: {
    backgroundColor: colors.primaryDark
  },
  pressedSecondary: {
    backgroundColor: '#f8fafc'
  },
  disabled: {
    opacity: 0.55
  }
});
