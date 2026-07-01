import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const FormErrorBanner = ({ message }) => {
  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  text: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700'
  }
});

export default FormErrorBanner;
