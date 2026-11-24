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
  Database,
  DownloadCloud,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff
} from 'lucide-react-native';
import { customerService, productService, quotationService } from '../api/services';
import { offlineSyncManager } from '../utils/offlineSyncManager';
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { colors } from '../theme/colors';
import { formatMoney } from '../utils/formatters';

const OfflineSyncScreen = ({ navigation }) => {
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
        'Are you sure you want to discard this unsynced quote draft?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete }
        ]
      );
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader
        title="Offline Outbox & Sync"
        subtitle="Catalog Cache & Field Sync"
        onBack={() => navigation?.goBack()}
      />

      <FlatList
        data={queue}
        keyExtractor={(item) => item.localId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
          />
        }
        ListHeaderComponent={
          <>
            {/* Status Feedback Banner */}
            {syncFeedback ? (
              <View
                style={[
                  styles.feedbackCard,
                  syncFeedback.type === 'success' && styles.feedbackSuccess,
                  syncFeedback.type === 'warning' && styles.feedbackWarning,
                  syncFeedback.type === 'error' && styles.feedbackError
                ]}
              >
                <Text
                  style={[
                    styles.feedbackText,
                    syncFeedback.type === 'success' && styles.feedbackSuccessText,
                    syncFeedback.type === 'warning' && styles.feedbackWarningText,
                    syncFeedback.type === 'error' && styles.feedbackErrorText
                  ]}
                >
                  {syncFeedback.message}
                </Text>
              </View>
            ) : null}

            {/* Offline Mode Switch Card */}
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <View style={[styles.modeIconBox, isForcedOffline && styles.modeIconBoxOffline]}>
                    {isForcedOffline ? (
                      <WifiOff size={20} color={colors.warning} />
                    ) : (
                      <Wifi size={20} color={colors.success} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>
                      {isForcedOffline ? 'Forced Offline Mode' : 'Connected Mode'}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {isForcedOffline
                        ? 'Simulating disconnected field mode'
                        : 'Active connection to server'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isForcedOffline}
                  onValueChange={handleToggleOffline}
                  thumbColor={isForcedOffline ? colors.warning : colors.primary}
                  trackColor={{ false: colors.border, true: colors.primarySubtle }}
                />
              </View>
            </View>

            {/* Catalog Cache Status Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Database size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>Local Catalog Cache</Text>
                </View>
                <TouchableOpacity
                  onPress={handleRefreshCatalog}
                  disabled={cachingMaster || isForcedOffline}
                  style={[
                    styles.refreshBtn,
                    (cachingMaster || isForcedOffline) && styles.btnDisabled
                  ]}
                >
                  {cachingMaster ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <DownloadCloud size={13} color={colors.primary} />
                      <Text style={styles.refreshBtnText}>Update</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.cacheStatsRow}>
                <View style={styles.cacheStat}>
                  <Text style={styles.cacheStatNumber}>{cachedProductsCount}</Text>
                  <Text style={styles.cacheStatLabel}>Products Cached</Text>
                </View>
                <View style={styles.cacheDivider} />
                <View style={styles.cacheStat}>
                  <Text style={styles.cacheStatNumber}>{cachedCustomersCount}</Text>
                  <Text style={styles.cacheStatLabel}>Customers Cached</Text>
                </View>
              </View>

              {lastSyncTime ? (
                <Text style={styles.lastSyncText}>
                  Last cached: {new Date(lastSyncTime).toLocaleTimeString()}
                </Text>
              ) : null}
            </View>

            {/* Queue Actions Header */}
            <View style={styles.queueHeaderRow}>
              <Text style={styles.queueTitle}>Pending Outbox ({queue.length})</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={handleSyncOutbox}
                  disabled={syncing || isForcedOffline}
                  style={[styles.syncAllBtn, (syncing || isForcedOffline) && styles.btnDisabled]}
                >
                  {syncing ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <RefreshCw size={13} color={colors.white} />
                      <Text style={styles.syncAllBtnText}>Sync All</Text>
                    </>
                  )}
                </TouchableOpacity>

                {queue.some((i) => i.status === 'SYNCED') && (
                  <TouchableOpacity onPress={handleClearSynced} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Clear Synced</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <CheckCircle2 size={36} color={colors.success} />
            <Text style={styles.emptyTitle}>Outbox is completely clear</Text>
            <Text style={styles.emptySubtitle}>All offline quotations are synchronized with the CRM.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.queueCard}>
            <View style={styles.queueTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueCustomer}>{item.customerName || 'Offline Estimate'}</Text>
                <Text style={styles.queueDate}>{new Date(item.enqueuedAt).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <StatusPill status={item.status} size="sm" />
                <Text style={styles.queueTotal}>{formatMoney(item.payload?.total)}</Text>
              </View>
            </View>

            {item.error ? (
              <View style={styles.queueErrorBox}>
                <Text style={styles.queueErrorText}>{item.error}</Text>
              </View>
            ) : null}

            <View style={styles.queueBottomRow}>
              <Text style={styles.queueItemsCount}>
                {item.payload?.items?.length || 0} items
              </Text>
              <TouchableOpacity onPress={() => handleDeleteItem(item.localId)}>
                <Trash2 size={15} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 12,
    paddingBottom: 28
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12
  },
  feedbackCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 10
  },
  feedbackSuccess: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder
  },
  feedbackSuccessText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700'
  },
  feedbackWarning: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder
  },
  feedbackWarningText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '700'
  },
  feedbackError: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder
  },
  feedbackErrorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700'
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700'
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  modeIconBox: {
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  modeIconBoxOffline: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  refreshBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  btnDisabled: {
    opacity: 0.5
  },
  cacheStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6
  },
  cacheStat: {
    alignItems: 'center'
  },
  cacheStatNumber: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  cacheStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
  },
  cacheDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderLight
  },
  lastSyncText: {
    color: colors.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8
  },
  queueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8
  },
  queueTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  syncAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  syncAllBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800'
  },
  clearBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  clearBtnText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700'
  },
  emptyWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 24,
    marginTop: 8,
    gap: 6
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center'
  },
  queueCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12
  },
  queueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  queueCustomer: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  queueDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  queueTotal: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900'
  },
  queueErrorBox: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 4,
    padding: 6,
    marginTop: 6
  },
  queueErrorText: {
    color: colors.danger,
    fontSize: 11
  },
  queueBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 6
  },
  queueItemsCount: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600'
  }
});

export default OfflineSyncScreen;
