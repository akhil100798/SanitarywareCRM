import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const Screen = ({ children, padded = true, safeTop = true }) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);

  return (
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: safeTop ? insets.top : 0,
          paddingBottom: tabBarHeight == null ? insets.bottom : 0,
          paddingLeft: insets.left,
          paddingRight: insets.right
        }
      ]}
    >
      <View style={[styles.content, padded && styles.padded]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flex: 1
  },
  padded: {
    padding: 16
  }
});

export default Screen;
