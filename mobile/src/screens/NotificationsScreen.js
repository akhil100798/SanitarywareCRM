import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  XCircle
} from 'lucide-react-native';
import { getErrorMessage } from '../api/client';
import { notificationService } from '../api/services';
import FormErrorBanner from '../components/FormErrorBanner';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { formatDate } from '../utils/formatters';

const STATUS_FILTERS = ['ALL', 'SENT', 'SIMULATED', 'FAILED'];
const CHANNEL_FILTERS = ['ALL', 'WHATSAPP', 'EMAIL', 'IN_APP'];

const ChannelIcon = ({ channel }) => {
  switch (channel?.toUpperCase()) {
    case 'WHATSAPP':
      return <MessageSquare size={16} color="#16a34a" />;
    case 'EMAIL':
      return <Mail size={16} color="#0284c7" />;
    case 'IN_APP':
    default:
      return <Bell size={16} color={colors.primary} />;
  }
};

const StatusBadge = ({ status }) => {
  const norm = status?.toUpperCase();
  if (norm === 'SENT') {
    return (
      <View style={[styles.badge, styles.badgeSent]}>
        <CheckCircle2 size={12} color="#0f766e" />
        <Text style={styles.badgeTextSent}>SENT</Text>
      </View>
    );
  }
  if (norm === 'SIMULATED') {
    return (
      <View style={[styles.badge, styles.badgeSimulated]}>
        <Clock size={12} color="#0284c7" />
        <Text style={styles.badgeTextSimulated}>SIMULATED</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.badgeFailed]}>
      <XCircle size={12} color="#ef4444" />
      <Text style={styles.badgeTextFailed}>FAILED</Text>
    </View>
  );
};

const NotificationsScreen = () => {
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
      <Screen>
        <EmptyView
          icon={AlertTriangle}
          title="Access Restricted"
          message="Notifications and dispatch management are restricted to ADMIN and MANAGER roles."
        />
      </Screen>
    );
  }

  if (loading && !refreshing) {
    return <LoadingView label="Loading notification dispatch logs..." />;
  }

  if (error && !logs.length) {
    return <ErrorView message={error} onRetry={loadLogs} />;
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.screenTitle}>Notifications & Alerts</Text>
            <Text style={styles.screenSubtitle}>Delivery logs, retries, and manual automation</Text>
          </View>
        </View>

        {/* Trigger Automation Buttons */}
        <View style={styles.triggerRow}>
          <TouchableOpacity
            style={[styles.triggerBtn, triggeringAction === 'low-stock' && styles.triggerBtnDisabled]}
            disabled={triggeringAction !== null}
            onPress={() => handleTrigger('low-stock')}
            activeOpacity={0.8}
          >
            {triggeringAction === 'low-stock' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Send size={13} color="#ffffff" />
                <Text style={styles.triggerBtnText}>Check Low Stock</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.triggerBtn, styles.triggerBtnAccent, triggeringAction === 'payment-due' && styles.triggerBtnDisabled]}
            disabled={triggeringAction !== null}
            onPress={() => handleTrigger('payment-due')}
            activeOpacity={0.8}
          >
            {triggeringAction === 'payment-due' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <RefreshCw size={13} color="#ffffff" />
                <Text style={styles.triggerBtnText}>Remind Due Payments</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {statusMessage ? (
          <View style={styles.statusToast}>
            <Text style={styles.statusToastText}>{statusMessage}</Text>
          </View>
        ) : null}

        <FormErrorBanner message={error} />

        {/* Status Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.filterGroupLabel}>Delivery Status</Text>
          <View style={styles.filterRow}>
            {STATUS_FILTERS.map((status) => {
              const active = selectedStatus === status;
              return (
                <Pressable
                  key={status}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {status}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Channel Filters */}
          <Text style={styles.filterGroupLabel}>Channel</Text>
          <View style={styles.filterRow}>
            {CHANNEL_FILTERS.map((channel) => {
              const active = selectedChannel === channel;
              return (
                <Pressable
                  key={channel}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedChannel(channel)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {channel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={logs}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <EmptyView
            icon={Bell}
            title="No dispatch logs found"
            message="No notification dispatches match the selected filters."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadLogs();
            }}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.channelBadge}>
                <ChannelIcon channel={item.channel} />
                <Text style={styles.channelText}>{item.channel}</Text>
              </View>
              <StatusBadge status={item.deliveryStatus} />
            </View>

            <View style={styles.recipientRow}>
              <Text style={styles.typeText}>{item.notificationType?.replace(/_/g, ' ')}</Text>
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>

            <Text style={styles.recipient}>To: {item.recipient}</Text>
            {item.subject ? <Text style={styles.subject}>{item.subject}</Text> : null}
            {item.messageContent ? (
              <Text style={styles.contentPreview} numberOfLines={2}>
                {item.messageContent}
              </Text>
            ) : null}

            {item.deliveryStatus === 'FAILED' && (
              <View style={styles.errorContainer}>
                {item.errorDetail ? (
                  <Text style={styles.errorText} numberOfLines={2}>
                    Error: {item.errorDetail}
                  </Text>
                ) : null}
                <View style={styles.retryRow}>
                  <Text style={styles.retryCountText}>Retries: {item.retryCount || 0}</Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    disabled={retryingId === item.id}
                    onPress={() => handleRetry(item.id)}
                  >
                    {retryingId === item.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <RefreshCw size={12} color="#ffffff" />
                        <Text style={styles.retryBtnText}>Retry Dispatch</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12
  },
  headerTitleRow: {
    marginBottom: 12
  },
  screenTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900'
  },
  screenSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2
  },
  triggerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  triggerBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 9
  },
  triggerBtnAccent: {
    backgroundColor: '#0891b2'
  },
  triggerBtnDisabled: {
    opacity: 0.6
  },
  triggerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  statusToast: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 8
  },
  statusToastText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  filtersSection: {
    marginTop: 4
  },
  filterGroupLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8
  },
  filterChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700'
  },
  filterChipTextActive: {
    color: '#ffffff'
  },
  list: {
    padding: 16,
    paddingBottom: 28
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  channelBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  channelText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  badge: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  badgeSent: {
    backgroundColor: '#ccfbf1'
  },
  badgeTextSent: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '800'
  },
  badgeSimulated: {
    backgroundColor: '#e0f2fe'
  },
  badgeTextSimulated: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '800'
  },
  badgeFailed: {
    backgroundColor: '#fee2e2'
  },
  badgeTextFailed: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800'
  },
  recipientRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  typeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800'
  },
  dateText: {
    color: colors.muted,
    fontSize: 11
  },
  recipient: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2
  },
  subject: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4
  },
  contentPreview: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 8
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginBottom: 6
  },
  retryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  retryCountText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600'
  },
  retryBtn: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  }
});

export default NotificationsScreen;
