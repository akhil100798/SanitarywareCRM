import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '../theme/colors';

const AppHeader = ({
  title,
  subtitle,
  onBack,
  rightAction,
  rightIcon: RightIcon,
  onRightPress,
  style
}) => {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <ArrowLeft size={22} color={colors.white} strokeWidth={2.2} />
          </Pressable>
        ) : null}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {rightAction || (RightIcon ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRightPress}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <RightIcon size={20} color={colors.white} strokeWidth={2.2} />
          </Pressable>
        ) : null)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryDark
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  titleWrap: {
    flex: 1
  },
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2
  },
  subtitle: {
    color: '#ccfbf1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBtnPressed: {
    backgroundColor: colors.primaryDark
  }
});

export default AppHeader;
