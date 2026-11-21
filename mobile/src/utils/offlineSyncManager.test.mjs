import assert from 'node:assert/strict';
import test from 'node:test';
import { createOfflineSyncManager } from './offlineSyncManager.js';

const createMockStorage = () => {
  const store = new Map();
  return {
    async getItem(key) {
      return store.get(key) ?? null;
    },
    async setItem(key, value) {
      store.set(key, String(value));
    },
    async removeItem(key) {
      store.delete(key);
    },
    async clear() {
      store.clear();
    }
  };
};

test('caching master catalog persists products and customers with timestamp', async () => {
  const storage = createMockStorage();
  const manager = createOfflineSyncManager(storage);

  const sampleProducts = [
    { id: 101, name: 'Wall Hung Closet', sku: 'WHC-101', sellingPrice: 8500 },
    { id: 102, name: 'Brass Basin Mixer', sku: 'BBM-202', sellingPrice: 2800 }
  ];
  const sampleCustomers = [
    { id: 1, name: 'Vikram Mehta', phone: '9876543210', city: 'Mumbai' }
  ];

  let notified = false;
  manager.subscribe(() => { notified = true; });

  const result = await manager.cacheMasterData({ products: sampleProducts, customers: sampleCustomers });

  assert.equal(result.productCount, 2);
  assert.equal(result.customerCount, 1);
  assert.ok(result.syncedAt);
  assert.equal(notified, true);

  const cachedProducts = await manager.getCachedProducts();
  const cachedCustomers = await manager.getCachedCustomers();
  const lastSyncTime = await manager.getLastSyncTime();

  assert.equal(cachedProducts.length, 2);
  assert.equal(cachedProducts[0].name, 'Wall Hung Closet');
  assert.equal(cachedCustomers.length, 1);
  assert.equal(cachedCustomers[0].name, 'Vikram Mehta');
  assert.equal(lastSyncTime, result.syncedAt);
});

test('enqueueing quotations creates queue item with PENDING_SYNC status and line items', async () => {
  const storage = createMockStorage();
  const manager = createOfflineSyncManager(storage);

  const quoteForm = {
    customerId: 5,
    customerName: 'Aarav Sharma',
    customerPhone: '9123456789',
    quotationDate: '2026-11-18',
    validUntil: '2026-11-25',
    taxPercentage: 18,
    discount: 500,
    subtotal: 10000,
    taxAmount: 1710,
    total: 11210,
    notes: 'Basement bathroom fixture bundle',
    termsAndConditions: 'Standard 7 days validity',
    items: [
      {
        productId: 101,
        productName: 'Wall Hung Closet',
        productSku: 'WHC-101',
        quantity: 2,
        unitPrice: 5000,
        discountPercentage: 0,
        lineTotal: 10000
      }
    ]
  };

  const enqueued = await manager.enqueueQuotation(quoteForm);

  assert.ok(enqueued.localId.startsWith('offline-quo-'));
  assert.equal(enqueued.syncStatus, 'PENDING_SYNC');
  assert.equal(enqueued.items.length, 1);
  assert.equal(enqueued.total, 11210);

  const pendingCount = await manager.getPendingCount();
  assert.equal(pendingCount, 1);

  const queue = await manager.getQueue();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].customerName, 'Aarav Sharma');
});

test('syncQueue uploads pending items and updates status to SYNCED with remote ID', async () => {
  const storage = createMockStorage();
  const manager = createOfflineSyncManager(storage);

  await manager.enqueueQuotation({
    customerId: 12,
    customerName: 'Priya Patel',
    subtotal: 5000,
    total: 5900,
    items: [{ productId: 201, productName: 'Sensor Tap', quantity: 1, unitPrice: 5000 }]
  });

  const mockQuotationService = {
    create: async (payload) => {
      assert.equal(payload.customerId, 12);
      assert.equal(payload.items.length, 1);
      assert.ok(payload.notes && payload.notes.includes('Offline Sync'));
      return {
        id: 777,
        quotationNumber: 'QUO-2026-0777'
      };
    }
  };

  const syncResult = await manager.syncQueue(mockQuotationService);

  assert.equal(syncResult.total, 1);
  assert.equal(syncResult.synced, 1);
  assert.equal(syncResult.failed, 0);

  const pendingCount = await manager.getPendingCount();
  assert.equal(pendingCount, 0);

  const queue = await manager.getQueue();
  assert.equal(queue[0].syncStatus, 'SYNCED');
  assert.equal(queue[0].remoteQuotationId, 777);
  assert.equal(queue[0].remoteQuotationNumber, 'QUO-2026-0777');
  assert.ok(queue[0].syncedAt);
});

test('syncQueue handles network failure and marks item as SYNC_ERROR with retry count', async () => {
  const storage = createMockStorage();
  const manager = createOfflineSyncManager(storage);

  await manager.enqueueQuotation({
    customerId: 99,
    customerName: 'Offline Builder',
    items: [{ productId: 301, quantity: 1, unitPrice: 2000 }]
  });

  const failingService = {
    create: async () => {
      const err = new Error('Network Connection Refused');
      err.response = { data: { message: 'Customer account inactive' } };
      throw err;
    }
  };

  const syncResult = await manager.syncQueue(failingService);

  assert.equal(syncResult.total, 1);
  assert.equal(syncResult.synced, 0);
  assert.equal(syncResult.failed, 1);

  const queue = await manager.getQueue();
  assert.equal(queue[0].syncStatus, 'SYNC_ERROR');
  assert.equal(queue[0].syncError, 'Customer account inactive');
  assert.equal(queue[0].retryCount, 1);
});

test('clearSyncedItems removes synced quotations while keeping pending/error items', async () => {
  const storage = createMockStorage();
  const manager = createOfflineSyncManager(storage);

  const item1 = await manager.enqueueQuotation({ customerId: 1, customerName: 'Item 1' });
  await manager.enqueueQuotation({ customerId: 2, customerName: 'Item 2' });

  // Manually mock one as synced
  const queue = await manager.getQueue();
  queue.find((i) => i.localId === item1.localId).syncStatus = 'SYNCED';
  await storage.setItem('@crm_offline_quotations_queue', JSON.stringify(queue));

  const remaining = await manager.clearSyncedItems();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].customerName, 'Item 2');
});

test('forced offline mode toggles and persists state', async () => {
  const storage = createMockStorage();
  const manager = createOfflineSyncManager(storage);

  assert.equal(await manager.isForcedOffline(), false);

  await manager.setForcedOffline(true);
  assert.equal(await manager.isForcedOffline(), true);

  await manager.setForcedOffline(false);
  assert.equal(await manager.isForcedOffline(), false);
});
