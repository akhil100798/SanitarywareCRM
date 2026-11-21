import AsyncStorage from '@react-native-async-storage/async-storage';

export const OFFLINE_STORAGE_KEYS = {
  PRODUCTS: '@crm_offline_products',
  CUSTOMERS: '@crm_offline_customers',
  QUEUE: '@crm_offline_quotations_queue',
  LAST_SYNC: '@crm_offline_last_sync',
  FORCED_OFFLINE: '@crm_offline_forced'
};

export const createOfflineSyncManager = (storage = AsyncStorage) => {
  const listeners = new Set();

  const notify = () => {
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('Error notifying sync listener', err);
        }
      }
    });
  };

  const safeJsonParse = (str, fallback) => {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  return {
    async cacheMasterData({ products = [], customers = [] }) {
      const timestamp = new Date().toISOString();
      await Promise.all([
        storage.setItem(OFFLINE_STORAGE_KEYS.PRODUCTS, JSON.stringify(products)),
        storage.setItem(OFFLINE_STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers)),
        storage.setItem(OFFLINE_STORAGE_KEYS.LAST_SYNC, timestamp)
      ]);
      notify();
      return {
        productCount: products.length,
        customerCount: customers.length,
        syncedAt: timestamp
      };
    },

    async getCachedProducts() {
      const data = await storage.getItem(OFFLINE_STORAGE_KEYS.PRODUCTS);
      return safeJsonParse(data, []);
    },

    async getCachedCustomers() {
      const data = await storage.getItem(OFFLINE_STORAGE_KEYS.CUSTOMERS);
      return safeJsonParse(data, []);
    },

    async getLastSyncTime() {
      return (await storage.getItem(OFFLINE_STORAGE_KEYS.LAST_SYNC)) || null;
    },

    async isForcedOffline() {
      const flag = await storage.getItem(OFFLINE_STORAGE_KEYS.FORCED_OFFLINE);
      return flag === 'true';
    },

    async setForcedOffline(forced) {
      if (forced) {
        await storage.setItem(OFFLINE_STORAGE_KEYS.FORCED_OFFLINE, 'true');
      } else {
        await storage.removeItem(OFFLINE_STORAGE_KEYS.FORCED_OFFLINE);
      }
      notify();
    },

    async getQueue() {
      const data = await storage.getItem(OFFLINE_STORAGE_KEYS.QUEUE);
      return safeJsonParse(data, []);
    },

    async getPendingCount() {
      const queue = await this.getQueue();
      return queue.filter((item) => item.syncStatus === 'PENDING_SYNC' || item.syncStatus === 'SYNC_ERROR').length;
    },

    async enqueueQuotation(form, extraInfo = {}) {
      const queue = await this.getQueue();
      const localId = `offline-quo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();

      const items = (form.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName || 'Unknown Product',
        productSku: item.productSku || '',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        discountPercentage: Number(item.discountPercentage) || 0,
        lineTotal: Number(item.lineTotal) || 0,
        notes: item.notes || ''
      }));

      const newRecord = {
        localId,
        customerId: form.customerId,
        customerName: form.customerName || extraInfo.customerName || 'Selected Customer',
        customerPhone: form.customerPhone || extraInfo.customerPhone || '',
        quotationDate: form.quotationDate || now.substring(0, 10),
        validUntil: form.validUntil || now.substring(0, 10),
        taxPercentage: Number(form.taxPercentage) || 0,
        discount: Number(form.discount) || 0,
        subtotal: Number(form.subtotal) || 0,
        taxAmount: Number(form.taxAmount) || 0,
        total: Number(form.total) || 0,
        notes: form.notes || '',
        termsAndConditions: form.termsAndConditions || '',
        items,
        syncStatus: 'PENDING_SYNC',
        syncError: null,
        retryCount: 0,
        createdAt: now,
        syncedAt: null,
        remoteQuotationId: null,
        remoteQuotationNumber: null
      };

      queue.unshift(newRecord);
      await storage.setItem(OFFLINE_STORAGE_KEYS.QUEUE, JSON.stringify(queue));
      notify();
      return newRecord;
    },

    async removeQueueItem(localId) {
      const queue = await this.getQueue();
      const filtered = queue.filter((item) => item.localId !== localId);
      await storage.setItem(OFFLINE_STORAGE_KEYS.QUEUE, JSON.stringify(filtered));
      notify();
      return filtered;
    },

    async clearSyncedItems() {
      const queue = await this.getQueue();
      const pendingOnly = queue.filter((item) => item.syncStatus !== 'SYNCED');
      await storage.setItem(OFFLINE_STORAGE_KEYS.QUEUE, JSON.stringify(pendingOnly));
      notify();
      return pendingOnly;
    },

    async clearQueue() {
      await storage.removeItem(OFFLINE_STORAGE_KEYS.QUEUE);
      notify();
    },

    async syncQueue(quotationApiService) {
      if (!quotationApiService || typeof quotationApiService.create !== 'function') {
        throw new Error('Valid quotationApiService with create method is required for sync.');
      }

      const queue = await this.getQueue();
      const pendingItems = queue.filter(
        (item) => item.syncStatus === 'PENDING_SYNC' || item.syncStatus === 'SYNC_ERROR'
      );

      if (pendingItems.length === 0) {
        return {
          total: 0,
          synced: 0,
          failed: 0,
          results: []
        };
      }

      let syncedCount = 0;
      let failedCount = 0;
      const results = [];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (item.syncStatus !== 'PENDING_SYNC' && item.syncStatus !== 'SYNC_ERROR') {
          continue;
        }

        item.syncStatus = 'SYNCING';
        item.syncError = null;

        const payload = {
          customerId: item.customerId,
          quotationDate: item.quotationDate,
          validUntil: item.validUntil,
          taxPercentage: item.taxPercentage,
          discount: item.discount,
          notes: item.notes
            ? (item.notes.includes('[Offline Sync]') ? item.notes : `${item.notes}\n[Offline Sync: Created in field outbox]`)
            : '[Offline Sync: Created in field outbox]',
          termsAndConditions: item.termsAndConditions,
          items: item.items.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercentage: line.discountPercentage,
            notes: line.notes || ''
          }))
        };

        try {
          const created = await quotationApiService.create(payload);
          item.syncStatus = 'SYNCED';
          item.remoteQuotationId = created.id;
          item.remoteQuotationNumber = created.quotationNumber;
          item.syncedAt = new Date().toISOString();
          item.syncError = null;
          syncedCount++;
          results.push({ localId: item.localId, success: true, remoteId: created.id });
        } catch (err) {
          const message = err?.response?.data?.message || err?.message || 'Sync failed due to network or server error';
          item.syncStatus = 'SYNC_ERROR';
          item.syncError = message;
          item.retryCount = (item.retryCount || 0) + 1;
          failedCount++;
          results.push({ localId: item.localId, success: false, error: message });
        }
      }

      await storage.setItem(OFFLINE_STORAGE_KEYS.QUEUE, JSON.stringify(queue));
      if (syncedCount > 0) {
        await storage.setItem(OFFLINE_STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      }
      notify();

      return {
        total: pendingItems.length,
        synced: syncedCount,
        failed: failedCount,
        results
      };
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
};

export const offlineSyncManager = createOfflineSyncManager(AsyncStorage);
