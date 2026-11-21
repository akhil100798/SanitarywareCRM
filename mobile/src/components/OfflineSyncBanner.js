import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react-native';
import { offlineSyncManager } from '../utils/offlineSyncManager';
import { quotationService } from '../api/services';

const OfflineSyncBanner = ({ navigation, style }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isForcedOffline, setIsForcedOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshStatus = async () => {
    try {
      const count = await offlineSyncManager.getPendingCount();
      const forced = await offlineSyncManager.isForcedOffline();
      setPendingCount(count);
      setIsForcedOffline(forced);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshStatus();
    const unsubscribe = offlineSyncManager.subscribe(refreshStatus);
    return () => unsubscribe();
  }, []);

  const handleSyncNow = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      await offlineSyncManager.syncQueue(quotationService);
      await refreshStatus();
    } catch {
      // errors recorded in queue
    } finally {
      setSyncing(false);
    }
  };

  if (!isForcedOffline && pendingCount === 0) {
    return null;
  }

  return (
    <View style={[styles.container, isForcedOffline ? styles.offlineBg : styles.pendingBg, style]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation?.navigate('OfflineSync')}
        style={styles.contentWrap}
      >
        <View style={styles.iconTextWrap}>
          {isForcedOffline ? (
            <WifiOff color="#fff" size={16} />
          ) : (
            <CloudOff color="#fff" size={16} />
          )}
          <Text style={styles.bannerText}>
            {isForcedOffline
              ? `Offline Mode Active (${pendingCount} queued)`
              : `${pendingCount} quote${pendingCount > 1 ? 's' : ''} waiting to sync`}
          </Text>
        </View>

        {!isForcedOffline && (
          <TouchableOpacity
            disabled={syncing}
            onPress={handleSyncNow}
            style={styles.syncButton}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <RefreshCw color="#fff" size={13} />
                <Text style={styles.syncButtonText}>Sync</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  offlineBg: {
    backgroundColor: '#dc2626'
  },
  pendingBg: {
    backgroundColor: '#d97706'
  },
  contentWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  iconTextWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    flex: 1
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  syncButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800'
  }
});

export default OfflineSyncBanner;
