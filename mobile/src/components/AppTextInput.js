import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';

const AppTextInput = ({ label, style, inputStyle, ...props }) => (
  <View style={[styles.wrap, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      placeholderTextColor={colors.muted}
      style={[styles.input, inputStyle, props.multiline && styles.multiline]}
      {...props}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  multiline: {
    minHeight: 82,
    textAlignVertical: 'top'
  }
});

export default AppTextInput;
