import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const DetailSection = ({ title, children, action }) => (
  <View style={styles.section}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  }
});

export default DetailSection;
