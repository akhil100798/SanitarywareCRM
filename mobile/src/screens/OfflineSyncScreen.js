import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  CheckCircle2,
  Clock,
  CloudOff,
  Database,
  DownloadCloud,
  FileText,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff
} from 'lucide-react-native';
import { customerService, productService, quotationService } from '../api/services';
import { offlineSyncManager } from '../utils/offlineSyncManager';
import Screen from '../components/Screen';
import { colors } from '../theme/colors';
import { formatMoney } from '../utils/formatters';

const OfflineSyncScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cachingMaster, setCachingMaster] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isForcedOffline, setIsForcedOffline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [cachedProductsCount, setCachedProductsCount] = useState(0);
  const [cachedCustomersCount, setCachedCustomersCount] = useState(0);
  const [queue, setQueue] = useState([]);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [forced, lastSync, prods, custs, currentQueue] = await Promise.all([
        offlineSyncManager.isForcedOffline(),
        offlineSyncManager.getLastSyncTime(),
        offlineSyncManager.getCachedProducts(),
        offlineSyncManager.getCachedCustomers(),
        offlineSyncManager.getQueue()
      ]);
      setIsForcedOffline(forced);
      setLastSyncTime(lastSync);
      setCachedProductsCount(prods.length);
      setCachedCustomersCount(custs.length);
      setQueue(currentQueue);
    } catch (err) {
      if (typeof console !== 'undefined') console.error('Failed to load offline sync data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = offlineSyncManager.subscribe(loadData);
    return () => unsubscribe();
  }, [loadData]);

  const handleToggleOffline = async (value) => {
    try {
      await offlineSyncManager.setForcedOffline(value);
      setIsForcedOffline(value);
    } catch {
      // ignore
    }
  };

  const handleRefreshCatalog = async () => {
    if (cachingMaster) return;
    try {
      setCachingMaster(true);
      setSyncFeedback(null);
      const [productsData, customersData] = await Promise.all([
        productService.searchProducts('', { size: 100 }),
        customerService.getAll({ size: 100 })
      ]);
      const products = Array.isArray(productsData) ? productsData : productsData?.content || [];
      const customers = Array.isArray(customersData) ? customersData : customersData?.content || [];

      await offlineSyncManager.cacheMasterData({ products, customers });
      setSyncFeedback({
        type: 'success',
        message: `Cached ${products.length} products and ${customers.length} customers for offline field use.`
      });
      await loadData();
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: `Catalog refresh failed: ${err?.message || 'Check network connection'}`
      });
    } finally {
      setCachingMaster(false);
    }
  };

  const handleSyncOutbox = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      setSyncFeedback(null);
      const result = await offlineSyncManager.syncQueue(quotationService);
      await loadData();
      if (result.total === 0) {
        setSyncFeedback({ type: 'info', message: 'No pending offline quotations to sync.' });
      } else if (result.failed === 0) {
        setSyncFeedback({
          type: 'success',
          message: `Successfully uploaded ${result.synced} quotation${result.synced > 1 ? 's' : ''} to CRM!`
        });
      } else {
        setSyncFeedback({
          type: 'warning',
          message: `Synced ${result.synced} quotation(s), but ${result.failed} failed. Review errors below.`
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: `Sync operation encountered an error: ${err?.message || 'Check backend status'}`
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClearSynced = async () => {
    try {
      await offlineSyncManager.clearSyncedItems();
      await loadData();
    } catch {
      // ignore
    }
  };

  const handleDeleteItem = (localId) => {
    const doDelete = async () => {
      await offlineSyncManager.removeQueueItem(localId);
      await loadData();
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete this offline quotation draft?')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Offline Draft',
        'Are you sure you want to remove this quotation from the sync outbox?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete }
        ]
      );
    }
  };

  const pendingCount = queue.filter(
    (i) => i.syncStatus === 'PENDING_SYNC' || i.syncStatus === 'SYNC_ERROR'
  ).length;

  if (loading) {
    return (
      <Screen padded={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading offline outbox...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        contentContainerStyle={styles.container}
        data={queue}
        keyExtractor={(item) => item.localId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Offline Outbox & Sync</Text>
              <Text style={styles.subtitle}>
                Create and manage quotes even in basements or offline job sites.
              </Text>
            </View>

            {syncFeedback && (
              <View
                style={[
                  styles.feedbackBox,
                  syncFeedback.type === 'success' && styles.feedbackSuccess,
                  syncFeedback.type === 'error' && styles.feedbackError,
                  syncFeedback.type === 'warning' && styles.feedbackWarning,
                  syncFeedback.type === 'info' && styles.feedbackInfo
                ]}
              >
                <Text style={styles.feedbackText}>{syncFeedback.message}</Text>
              </View>
            )}

            {/* Offline Simulation Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.row}>
                  {isForcedOffline ? <WifiOff color={colors.danger} size={20} /> : <Wifi color={colors.success} size={20} />}
                  <Text style={styles.cardTitle}>Connection Mode</Text>
                </View>
                <Switch
                  onValueChange={handleToggleOffline}
                  thumbColor={isForcedOffline ? colors.danger : colors.primary}
                  trackColor={{ false: '#cbd5e1', true: '#fca5a5' }}
                  value={isForcedOffline}
                />
              </View>
              <Text style={styles.cardMeta}>
                {isForcedOffline
                  ? 'Forced Offline Mode is active. New quotations will be saved directly to the local outbox without contacting the server.'
                  : 'Online Mode is active. Quotations are created immediately on the backend server with automatic outbox fallback on failure.'}
              </Text>
            </View>

            {/* Master Catalog Cache Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.row}>
                  <Database color={colors.primary} size={20} />
                  <Text style={styles.cardTitle}>Master Catalog Cache</Text>
                </View>
                <TouchableOpacity
                  disabled={cachingMaster || isForcedOffline}
                  onPress={handleRefreshCatalog}
                  style={[styles.smallBtn, (cachingMaster || isForcedOffline) && styles.btnDisabled]}
                >
                  {cachingMaster ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <>
                      <DownloadCloud color={colors.primary} size={14} />
                      <Text style={styles.smallBtnText}>Update Cache</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{cachedProductsCount}</Text>
                  <Text style={styles.statLabel}>Products</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{cachedCustomersCount}</Text>
                  <Text style={styles.statLabel}>Customers</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>
                    {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </Text>
                  <Text style={styles.statLabel}>Last Cache Sync</Text>
                </View>
              </View>
            </View>

            {/* Outbox Actions Bar */}
            <View style={styles.outboxHeader}>
              <View style={styles.row}>
                <FileText color={colors.text} size={18} />
                <Text style={styles.sectionTitle}>Local Quotation Outbox</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount} Pending</Text>
                </View>
              </View>
              <View style={styles.row}>
                {queue.some((i) => i.syncStatus === 'SYNCED') && (
                  <TouchableOpacity onPress={handleClearSynced} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Clear Synced</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  disabled={syncing || pendingCount === 0 || isForcedOffline}
                  onPress={handleSyncOutbox}
                  style={[
                    styles.syncNowBtn,
                    (syncing || pendingCount === 0 || isForcedOffline) && styles.btnDisabled
                  ]}
                >
                  {syncing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <RefreshCw color="#fff" size={14} />
                      <Text style={styles.syncNowBtnText}>Sync All</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <CloudOff color={colors.muted} size={32} />
            <Text style={styles.emptyTitle}>Outbox is Empty</Text>
            <Text style={styles.emptySub}>
              Quotations drafted when offline will appear here and sync automatically when network is available.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSynced = item.syncStatus === 'SYNCED';
          const isError = item.syncStatus === 'SYNC_ERROR';
          const isSyncing = item.syncStatus === 'SYNCING';

          return (
            <View style={styles.quoteCard}>
              <View style={styles.quoteHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quoteCustomer}>{item.customerName}</Text>
                  <Text style={styles.quoteSub}>
                    Drafted: {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.statusWrap}>
                  {isSynced && (
                    <TouchableOpacity
                      onPress={() => navigation?.navigate('QuotationDetail', { id: item.remoteQuotationId })}
                      style={[styles.statusBadge, styles.statusSynced]}
                    >
                      <CheckCircle2 color="#166534" size={12} />
                      <Text style={styles.statusSyncedText}>
                        Synced ({item.remoteQuotationNumber || `#${item.remoteQuotationId}`})
                      </Text>
                    </TouchableOpacity>
                  )}
                  {isError && (
                    <View style={[styles.statusBadge, styles.statusError]}>
                      <Text style={styles.statusErrorText}>Sync Failed</Text>
                    </View>
                  )}
                  {isSyncing && (
                    <View style={[styles.statusBadge, styles.statusSyncing]}>
                      <ActivityIndicator color="#1d4ed8" size="small" />
                      <Text style={styles.statusSyncingText}>Syncing...</Text>
                    </View>
                  )}
                  {!isSynced && !isError && !isSyncing && (
                    <View style={[styles.statusBadge, styles.statusPending]}>
                      <Clock color="#854d0e" size={12} />
                      <Text style={styles.statusPendingText}>Waiting to Sync</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => handleDeleteItem(item.localId)} style={styles.deleteBtn}>
                    <Trash2 color={colors.danger} size={16} />
                  </TouchableOpacity>
                </View>
              </View>

              {isError && item.syncError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>Error: {item.syncError}</Text>
                </View>
              )}

              <View style={styles.quoteBody}>
                <Text style={styles.quoteItemsCount}>
                  {item.items.length} line item{item.items.length > 1 ? 's' : ''}:
                </Text>
                {item.items.map((line, idx) => (
                  <Text key={idx} numberOfLines={1} style={styles.quoteLineItem}>
                    • {line.productName} ({line.quantity} × {formatMoney(line.unitPrice)}) = {formatMoney(line.lineTotal)}
                  </Text>
                ))}
              </View>

              <View style={styles.quoteFooter}>
                <Text style={styles.quoteLocalId}>ID: {item.localId}</Text>
                <Text style={styles.quoteTotal}>{formatMoney(item.total)}</Text>
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40
  },
  header: {
    marginBottom: 16
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  feedbackBox: {
    borderRadius: 8,
    marginBottom: 14,
    padding: 12
  },
  feedbackSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1
  },
  feedbackError: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1
  },
  feedbackWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde047',
    borderWidth: 1
  },
  feedbackInfo: {
    backgroundColor: '#e0f2fe',
    borderColor: '#7dd3fc',
    borderWidth: 1
  },
  feedbackText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600'
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  smallBtn: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  smallBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    flex: 1,
    padding: 10
  },
  statVal: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900'
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  outboxHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  badge: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  badgeText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '800'
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  clearBtnText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  syncNowBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  syncNowBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800'
  },
  btnDisabled: {
    opacity: 0.5
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 32
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12
  },
  emptySub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center'
  },
  quoteCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14
  },
  quoteHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  quoteCustomer: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  quoteSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  statusWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  statusSynced: {
    backgroundColor: '#dcfce7'
  },
  statusSyncedText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700'
  },
  statusError: {
    backgroundColor: '#fee2e2'
  },
  statusErrorText: {
    color: '#991b1b',
    fontSize: 11,
    fontWeight: '700'
  },
  statusSyncing: {
    backgroundColor: '#dbeafe'
  },
  statusSyncingText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700'
  },
  statusPending: {
    backgroundColor: '#fef3c7'
  },
  statusPendingText: {
    color: '#854d0e',
    fontSize: 11,
    fontWeight: '700'
  },
  deleteBtn: {
    padding: 4
  },
  errorBanner: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    padding: 8
  },
  errorText: {
    color: '#be123c',
    fontSize: 11,
    fontWeight: '600'
  },
  quoteBody: {
    borderBottomColor: colors.border,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginVertical: 10,
    paddingVertical: 8
  },
  quoteItemsCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4
  },
  quoteLineItem: {
    color: colors.text,
    fontSize: 12,
    marginVertical: 1
  },
  quoteFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  quoteLocalId: {
    color: colors.muted,
    fontSize: 10
  },
  quoteTotal: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '900'
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 12
  }
});

export default OfflineSyncScreen;
