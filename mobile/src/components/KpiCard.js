import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const KpiCard = ({
  label,
  value,
  subtitle,
  delta,
  deltaType = 'positive',
  icon: Icon,
  onPress,
  style
}) => {
  const CardWrap = onPress ? Pressable : View;

  return (
    <CardWrap
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        style
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {Icon ? (
          <View style={styles.iconBox}>
            <Icon size={16} color={colors.primary} />
          </View>
        ) : null}
      </View>

      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>

      {delta || subtitle ? (
        <View style={styles.bottomRow}>
          {delta ? (
            <Text
              style={[
                styles.delta,
                deltaType === 'negative'
                  ? styles.deltaNegative
                  : styles.deltaPositive
              ]}
              numberOfLines={1}
            >
              {delta}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </CardWrap>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between'
  },
  pressed: {
    opacity: 0.9,
    backgroundColor: '#f8fafc'
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center'
  },
  value: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  delta: {
    fontSize: 11,
    fontWeight: '800'
  },
  deltaPositive: {
    color: colors.success
  },
  deltaNegative: {
    color: colors.danger
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '500'
  }
});

export default KpiCard;
