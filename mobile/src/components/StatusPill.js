import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const resolveTheme = (status, type) => {
  if (type) {
    switch (type) {
      case 'success':
        return { bg: colors.successBg, fg: colors.success, border: colors.successBorder };
      case 'warning':
        return { bg: colors.warningBg, fg: colors.warning, border: colors.warningBorder };
      case 'danger':
        return { bg: colors.dangerBg, fg: colors.danger, border: colors.dangerBorder };
      case 'info':
        return { bg: colors.infoBg, fg: colors.info, border: colors.infoBorder };
      case 'neutral':
      default:
        return { bg: colors.neutralBg, fg: colors.neutral, border: colors.neutralBorder };
    }
  }

  const s = String(status || '').toUpperCase();
  if (['PAID', 'DELIVERED', 'ACCEPTED', 'ACTIVE', 'IN STOCK', 'RESOLVED', 'SUCCESS', 'CONFIRMED'].includes(s)) {
    return { bg: colors.successBg, fg: colors.success, border: colors.successBorder };
  }
  if (['PENDING', 'PARTIAL', 'PROCESSING', 'SENT', 'LOW STOCK', 'DISPATCHED', 'QUEUED'].includes(s)) {
    return { bg: colors.warningBg, fg: colors.warning, border: colors.warningBorder };
  }
  if (['UNPAID', 'CANCELLED', 'REJECTED', 'INACTIVE', 'EXPIRED', 'OUT OF STOCK', 'OVERDUE', 'FAILED', 'HIGH'].includes(s)) {
    return { bg: colors.dangerBg, fg: colors.danger, border: colors.dangerBorder };
  }
  return { bg: colors.infoBg, fg: colors.info, border: colors.infoBorder };
};

const StatusPill = ({ label, status, type, size = 'sm', style }) => {
  const displayLabel = label || status || '';
  if (!displayLabel) return null;

  const theme = resolveTheme(displayLabel, type);
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 8 : 12
        },
        style
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: theme.fg,
            fontSize: isSm ? 10 : 12
          }
        ]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontWeight: '800',
    letterSpacing: 0.3
  }
});

export default StatusPill;
