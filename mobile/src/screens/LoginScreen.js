import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Droplet, ShieldCheck } from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import Screen from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const LoginScreen = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Enter username and password.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await login(username.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Droplet color={colors.primary} size={32} strokeWidth={2.2} />
          </View>
          <Text style={styles.brand}>HydroSleek CRM</Text>
          <Text style={styles.subtitle}>Sanitaryware & Bathware Showroom Management</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            accessibilityLabel="Username"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setUsername}
            placeholder="admin"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={username}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: loading, busy: loading }}
            disabled={loading}
            onPress={handleLogin}
            style={[styles.button, loading && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerNote}>
          <ShieldCheck size={14} color={colors.muted} />
          <Text style={styles.footerText}>Secure JWT session with encrypted device storage</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  header: {
    alignItems: 'center',
    marginBottom: 28
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  brand: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center'
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14
  },
  buttonDisabled: {
    backgroundColor: colors.primaryDark,
    opacity: 0.7
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800'
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20
  },
  footerText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '500'
  }
});

export default LoginScreen;
