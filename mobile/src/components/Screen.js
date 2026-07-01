import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

const Screen = ({ children, padded = true }) => (
  <SafeAreaView style={styles.safeArea}>
    <View style={[styles.content, padded && styles.padded]}>{children}</View>
  </SafeAreaView>
);

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
