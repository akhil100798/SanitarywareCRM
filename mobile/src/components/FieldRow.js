import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const FieldRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || '-'}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: 9
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600'
  }
});

export default FieldRow;
