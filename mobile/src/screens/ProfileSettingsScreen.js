import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CloudOff,
  Globe,
  Info,
  LogOut,
  Mail,
  Shield,
  Smartphone,
  User
} from 'lucide-react-native';
import { API_BASE_URL } from '../api/config';
import Screen from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme/colors';
import { offlineSyncManager } from '../utils/offlineSyncManager';

const APP_VERSION = 'v1.3.0';

const ProfileSettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      try {
        const count = await offlineSyncManager.getPendingCount();
        if (mounted) setPendingQueueCount(count);
      } catch {
        // ignore
      }
    };
    fetchPending();
    const unsub = offlineSyncManager.subscribe(fetchPending);
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm('Are you sure you want to sign out?')
        : true;
      if (confirmed) {
        logout();
      }
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account? Local cached sessions will be securely cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  const role = user?.role || 'USER';

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile & Settings</Text>
          <Text style={styles.subtitle}>Account credentials, system status & offline storage</Text>
        </View>

        {/* User Profile Card */}
        <View style={styles.card}>
          <View style={styles.userCardRow}>
            <View style={styles.avatarWrap}>
              <User color={colors.primary} size={30} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.fullName || user?.username || 'Authenticated User'}
              </Text>
              <View style={styles.emailRow}>
                <Mail color={colors.muted} size={13} />
                <Text style={styles.userEmail}>{user?.email || user?.username || 'No email'}</Text>
              </View>
              <View style={styles.roleBadge}>
                <Shield color={colors.primary} size={12} />
                <Text style={styles.roleBadgeText}>{role}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Offline Outbox & Sync Quick Link Card */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.navigate('OfflineSync')}
          style={[styles.card, styles.interactiveCard]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, pendingQueueCount > 0 && styles.iconWrapPending]}>
              <CloudOff
                color={pendingQueueCount > 0 ? colors.warning : colors.primary}
                size={22}
              />
            </View>
            <View style={styles.cardHeaderTextWrap}>
              <View style={styles.titleWithBadge}>
                <Text style={styles.cardSectionTitle}>Offline Outbox & Sync</Text>
                {pendingQueueCount > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{pendingQueueCount} queued</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardSectionSub}>
                {pendingQueueCount > 0
                  ? 'Pending quotations awaiting network connection'
                  : 'All offline records synchronized with server'}
              </Text>
            </View>
            <ArrowRight color={colors.muted} size={18} />
          </View>
        </TouchableOpacity>

        {/* API Connection & Network Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconWrap}>
              <Activity color={colors.primary} size={22} />
            </View>
            <View style={styles.cardHeaderTextWrap}>
              <Text style={styles.cardSectionTitle}>API Connection Status</Text>
              <Text style={styles.cardSectionSub}>Active REST endpoint gateway</Text>
            </View>
            <View style={styles.connectedBadge}>
              <CheckCircle2 color={colors.success} size={12} />
              <Text style={styles.connectedBadgeText}>Active</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Globe color={colors.muted} size={14} />
            <Text numberOfLines={1} style={styles.infoLabel}>Endpoint Base URL:</Text>
            <Text numberOfLines={1} style={styles.infoValue}>
              {API_BASE_URL || 'http://10.0.2.2:8081/api'}
            </Text>
          </View>
        </View>

        {/* App Version & Build Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconWrap}>
              <Info color={colors.primary} size={22} />
            </View>
            <View style={styles.cardHeaderTextWrap}>
              <Text style={styles.cardSectionTitle}>Application Details</Text>
              <Text style={styles.cardSectionSub}>Sanitaryware CRM Mobile Edition</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <Smartphone color={colors.muted} size={14} />
              <Text style={styles.metaLabel}>Platform:</Text>
              <Text style={styles.metaValue}>{Platform.OS.toUpperCase()}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Release Version:</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>{APP_VERSION}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Security:</Text>
              <Text style={styles.metaValue}>JWT + Expo SecureStore</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSignOut}
          style={styles.signOutBtn}
        >
          <LogOut color={colors.danger} size={18} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: spacing.lg
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg
  },
  interactiveCard: {
    borderColor: '#99f6e4'
  },
  userCardRow: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 64
  },
  userInfo: {
    flex: 1
  },
  userName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  emailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 2
  },
  userEmail: {
    color: colors.muted,
    fontSize: 13
  },
  roleBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ccfbf1',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  roleBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 40
  },
  iconWrapPending: {
    backgroundColor: '#fef3c7'
  },
  cardHeaderTextWrap: {
    flex: 1
  },
  titleWithBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  cardSectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  cardSectionSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  pendingBadgeText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '800'
  },
  connectedBadge: {
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  connectedBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800'
  },
  infoRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.sm
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700'
  },
  infoValue: {
    color: colors.text,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12
  },
  metaGrid: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 8,
    marginTop: spacing.md,
    paddingTop: spacing.sm
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600'
  },
  metaValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  versionBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  versionBadgeText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '800'
  },
  signOutBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#fca5a5',
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    paddingVertical: 12
  },
  signOutBtnText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800'
  }
});

export default ProfileSettingsScreen;
