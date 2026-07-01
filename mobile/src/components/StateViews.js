import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';

export const LoadingView = ({ label = 'Loading...' }) => (
  <View style={styles.center}>
    <ActivityIndicator color={colors.primary} size="large" />
    <Text style={styles.muted}>{label}</Text>
  </View>
);

export const EmptyView = ({ title = 'Nothing here yet', message }) => (
  <View style={styles.center}>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.muted}>{message}</Text> : null}
  </View>
);

export const ErrorView = ({ message, onRetry }) => (
  <View style={styles.center}>
    <Text style={styles.title}>Could not load data</Text>
    <Text style={styles.muted}>{message}</Text>
    {onRetry ? (
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center'
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '700'
  }
});
