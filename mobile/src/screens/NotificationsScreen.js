import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  AlertTriangle,
  Bell,
  Mail,
  MessageSquare,
  RefreshCw,
  Send
} from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { notificationService } from '../api/services';
import AppHeader from '../components/AppHeader';
import FormErrorBanner from '../components/FormErrorBanner';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { formatDate } from '../utils/formatters';

const STATUS_FILTERS = ['ALL', 'SENT', 'SIMULATED', 'FAILED'];
const CHANNEL_FILTERS = ['ALL', 'WHATSAPP', 'EMAIL', 'IN_APP'];

const ChannelIcon = ({ channel }) => {
  switch (channel?.toUpperCase()) {
    case 'WHATSAPP':
      return <MessageSquare size={16} color="#059669" />;
    case 'EMAIL':
      return <Mail size={16} color="#0284c7" />;
    case 'IN_APP':
    default:
      return <Bell size={16} color={colors.primary} />;
  }
};

const NotificationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const isAuthorized = ['ADMIN', 'MANAGER'].includes(user?.role);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedChannel, setSelectedChannel] = useState('ALL');

  const [retryingId, setRetryingId] = useState(null);
  const [triggeringAction, setTriggeringAction] = useState(null);

  const loadLogs = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      setError('');
      const params = {
        size: 50,
        sort: 'createdAt,desc'
      };
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedChannel !== 'ALL') params.channel = selectedChannel;

      const page = await notificationService.getDispatchLogs(params);
      setLogs(page?.content || (Array.isArray(page) ? page : []));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthorized, selectedChannel, selectedStatus]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRetry = async (logId) => {
    try {
      setRetryingId(logId);
      setStatusMessage('');
      const updated = await notificationService.retryDispatch(logId);
      setLogs((current) =>
        current.map((item) => (item.id === logId ? updated : item))
      );
      setStatusMessage(`Log #${logId} retried successfully.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRetryingId(null);
    }
  };

  const handleTrigger = async (type) => {
    try {
      setTriggeringAction(type);
      setStatusMessage('');
      setError('');
      if (type === 'low-stock') {
        const res = await notificationService.triggerLowStock();
        setStatusMessage(res?.message || 'Low-stock check completed.');
      } else if (type === 'payment-due') {
        const res = await notificationService.triggerPaymentDue();
        setStatusMessage(res?.message || 'Payment-due reminders dispatched.');
      }
      await loadLogs();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTriggeringAction(null);
    }
  };

  if (!isAuthorized) {
    return (
      <Screen padded={false}>
        <AppHeader title="Notifications & Alerts" onBack={() => navigation?.goBack()} />
        <EmptyView
          icon={AlertTriangle}
          title="Access Restricted"
          message="Notifications and dispatch management are restricted to ADMIN and MANAGER roles."
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <AppHeader
        title="Notifications & Alerts"
        subtitle="Dispatch Logs & System Alerts"
        onBack={() => navigation?.goBack()}
      />

      {/* Filter and Trigger Bar */}
      <View style={styles.topBar}>
        {/* Quick Triggers */}
        <View style={styles.triggerRow}>
          <TouchableOpacity
            style={[styles.triggerBtn, triggeringAction === 'low-stock' && styles.triggerBtnDisabled]}
            onPress={() => handleTrigger('low-stock')}
            disabled={triggeringAction !== null}
          >
            {triggeringAction === 'low-stock' ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Send size={13} color={colors.white} />
                <Text style={styles.triggerBtnText}>Check Low Stock</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.triggerBtn, triggeringAction === 'payment-due' && styles.triggerBtnDisabled]}
            onPress={() => handleTrigger('payment-due')}
            disabled={triggeringAction !== null}
          >
            {triggeringAction === 'payment-due' ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Send size={13} color={colors.white} />
                <Text style={styles.triggerBtnText}>Payment Reminders</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Status & Channel Filters */}
        <View style={styles.filtersRow}>
          {STATUS_FILTERS.map((st) => {
            const isActive = selectedStatus === st;
            return (
              <TouchableOpacity
                key={st}
                onPress={() => setSelectedStatus(st)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[styles.filtersRow, { marginTop: 6 }]}>
          {CHANNEL_FILTERS.map((ch) => {
            const isActive = selectedChannel === ch;
            return (
              <TouchableOpacity
                key={ch}
                onPress={() => setSelectedChannel(ch)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {ch}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {statusMessage ? (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>{statusMessage}</Text>
        </View>
      ) : null}

      <FormErrorBanner message={error} />

      {loading ? (
        <LoadingView label="Loading dispatch logs..." />
      ) : error && !logs.length ? (
        <ErrorView message={error} onRetry={loadLogs} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadLogs();
              }}
            />
          }
          ListEmptyComponent={
            <EmptyView
              icon={Bell}
              title="No notifications match"
              message="No dispatch logs found with the selected filter."
            />
          }
          renderItem={({ item }) => (
            <View style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={styles.channelWrap}>
                  <ChannelIcon channel={item.channel} />
                  <Text style={styles.channelText}>{item.channel}</Text>
                </View>
                <StatusPill status={item.status} size="sm" />
              </View>

              <Text style={styles.recipientText} numberOfLines={1}>
                {item.recipient}
              </Text>
              {item.subject ? (
                <Text style={styles.subjectText} numberOfLines={1}>
                  {item.subject}
                </Text>
              ) : null}

              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>

              {item.errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{item.errorMessage}</Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => handleRetry(item.id)}
                    disabled={retryingId === item.id}
                  >
                    {retryingId === item.id ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <RefreshCw size={12} color={colors.white} />
                        <Text style={styles.retryBtnText}>Retry</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: 12
  },
  triggerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  triggerBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 8
  },
  triggerBtnDisabled: {
    opacity: 0.6
  },
  triggerBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800'
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 6
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  filterChipActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary
  },
  filterChipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700'
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '800'
  },
  statusBanner: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1,
    padding: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 6
  },
  statusBannerText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700'
  },
  listContent: {
    padding: 12,
    paddingBottom: 28
  },
  logCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12
  },
  logHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  channelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  channelText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  recipientText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  subjectText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  dateText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4
  },
  errorContainer: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 8
  },
  errorText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 8
  },
  retryBtn: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  retryBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800'
  }
});

export default NotificationsScreen;
