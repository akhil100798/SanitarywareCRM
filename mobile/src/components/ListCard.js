import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const getBadgeColors = (badgeText) => {
  if (!badgeText) return { bg: '#f1f5f9', fg: '#475569' };
  const text = badgeText.toUpperCase();
  if (text === 'PAID' || text === 'DELIVERED' || text === 'ACCEPTED' || text === 'ACTIVE') {
    return { bg: '#ecfdf5', fg: '#047857' };
  }
  if (text === 'PENDING' || text === 'PARTIAL' || text === 'PROCESSING' || text === 'SENT' || text === 'CONFIRMED') {
    return { bg: '#fffbeb', fg: '#b45309' };
  }
  if (text === 'UNPAID' || text === 'CANCELLED' || text === 'REJECTED' || text === 'INACTIVE' || text === 'EXPIRED') {
    return { bg: '#fef2f2', fg: '#b91c1c' };
  }
  return { bg: '#f0fdfa', fg: '#0f766e' };
};

const CardContent = ({ item }) => {
  const badgeColors = getBadgeColors(item.badge);
  return (
    <>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
        {item.amount ? <Text style={styles.amount}>{item.amount}</Text> : null}
      </View>
      <View style={styles.footer}>
        {item.meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {item.meta}
          </Text>
        ) : null}
        {item.badge ? (
          <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
            <Text style={[styles.badgeText, { color: badgeColors.fg }]} numberOfLines={1}>
              {item.badge}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
};

const ListCard = ({ item, onPress }) => {
  if (!onPress) {
    return (
      <View style={styles.card}>
        <CardContent item={item} />
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <CardContent item={item} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.995 }]
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  titleBlock: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  amount: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800'
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12
  },
  meta: {
    color: colors.muted,
    flex: 1,
    fontSize: 12
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700'
  }
});

export default ListCard;