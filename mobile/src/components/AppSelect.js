import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const AppSelect = ({ label, options, value, onChange }) => (
  <View style={styles.wrap}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <View style={styles.options}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={[styles.optionText, selected && styles.selectedText]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
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
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  option: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  optionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  selectedText: {
    color: colors.surface
  }
});

export default AppSelect;
