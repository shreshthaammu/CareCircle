import admin from 'firebase-admin';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let isRealFirestore = false;
let firestoreDb: admin.firestore.Firestore | null = null;
let firestoreInitialized = false;
let memoryTransactionQueue: Promise<void> = Promise.resolve();

// Local high-fidelity mock store for when Firestore credentials/emulator are not configured
const inMemoryStore: Record<string, Map<string, any>> = {
  circles: new Map(),
  medications: new Map(),
  doses: new Map(),
  appointments: new Map(),
  suggestions: new Map(),
  notifications: new Map(),
  audit_logs: new Map(),
  action_tokens: new Map(),
};

export function initFirestore(): void {
  if (firestoreInitialized) return;

  try {
    if ((env.NODE_ENV === 'test' || process.env.VITEST === 'true') && !env.FIRESTORE_EMULATOR_HOST) {
      logger.info('Running in test in-memory store mode');
      isRealFirestore = false;
    } else if (env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST;
      logger.info(`Connecting to Firestore Emulator at ${env.FIRESTORE_EMULATOR_HOST}`);
      admin.initializeApp({ projectId: env.GOOGLE_CLOUD_PROJECT || 'carecircle-dev' });
      firestoreDb = admin.firestore();
      isRealFirestore = true;
    } else if (!env.ALLOW_IN_MEMORY_STORE && (env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE)) {
      logger.info('Initializing Google Cloud Firestore with environment credentials');
      admin.initializeApp();
      firestoreDb = admin.firestore();
      isRealFirestore = true;
    } else if (env.ALLOW_IN_MEMORY_STORE) {
      logger.info('Running in local in-memory store mode (Firestore credentials not configured)');
      isRealFirestore = false;
    } else {
      throw new Error('Firestore is not configured. Configure the emulator or credentials, or enable ALLOW_IN_MEMORY_STORE.');
    }
    firestoreInitialized = true;
  } catch (error) {
    firestoreInitialized = false;
    isRealFirestore = false;
    if (!env.ALLOW_IN_MEMORY_STORE) {
      throw error;
    }
    logger.warn('Firestore initialization failed; falling back to local in-memory mode');
    firestoreInitialized = true;
  }
}

export function isUsingInMemoryStore(): boolean {
  return !isRealFirestore;
}

export async function verifyFirestoreConnection(): Promise<void> {
  if (!isRealFirestore || !firestoreDb) {
    return;
  }
  try {
    await firestoreDb.collection('_health').limit(1).get();
  } catch (error) {
    if (env.ALLOW_IN_MEMORY_STORE) {
      logger.warn('Firestore connection check failed; falling back to in-memory store mode', error);
      isRealFirestore = false;
      firestoreDb = null;
      return;
    }
    throw error;
  }
}

export interface StoreTransaction {
  get<T>(collectionName: string, id: string): Promise<T | null>;
  create<T>(collectionName: string, id: string, value: T): Promise<boolean>;
  update<T>(collectionName: string, id: string, updates: Partial<T>): Promise<void>;
}

export async function runStoreTransaction<T>(
  operation: (transaction: StoreTransaction) => Promise<T>
): Promise<T> {
  if (isRealFirestore && firestoreDb) {
    return firestoreDb.runTransaction(async (transaction) => operation({
      async get<U>(collectionName: string, id: string): Promise<U | null> {
        const snapshot = await transaction.get(firestoreDb!.collection(collectionName).doc(id));
        return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } as U : null;
      },
      async create<U>(collectionName: string, id: string, value: U): Promise<boolean> {
        const reference = firestoreDb!.collection(collectionName).doc(id);
        const snapshot = await transaction.get(reference);
        if (snapshot.exists) return false;
        transaction.create(reference, value as FirebaseFirestore.DocumentData);
        return true;
      },
      async update<U>(collectionName: string, id: string, updates: Partial<U>): Promise<void> {
        transaction.set(
          firestoreDb!.collection(collectionName).doc(id),
          updates as FirebaseFirestore.DocumentData,
          { merge: true }
        );
      },
    }));
  }

  let release!: () => void;
  const previous = memoryTransactionQueue;
  memoryTransactionQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;

  try {
    return await operation({
      async get<U>(collectionName: string, id: string): Promise<U | null> {
        const item = inMemoryStore[collectionName]?.get(id);
        return item ? { ...item } as U : null;
      },
      async create<U>(collectionName: string, id: string, value: U): Promise<boolean> {
        const collection = inMemoryStore[collectionName];
        if (collection.has(id)) return false;
        collection.set(id, { ...value });
        return true;
      },
      async update<U>(collectionName: string, id: string, updates: Partial<U>): Promise<void> {
        const collection = inMemoryStore[collectionName];
        const current = collection.get(id);
        if (!current) throw new Error(`Cannot update missing ${collectionName} record`);
        collection.set(id, { ...current, ...updates });
      },
    });
  } finally {
    release();
  }
}

// Universal Repository interface that transparently queries Firestore or In-Memory store
export class BaseRepository<T extends { id: string }> {
  constructor(private collectionName: string) {
    if (!inMemoryStore[collectionName]) {
      inMemoryStore[collectionName] = new Map();
    }
  }

  async getById(id: string): Promise<T | null> {
    if (isRealFirestore && firestoreDb) {
      const doc = await firestoreDb.collection(this.collectionName).doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as T;
    }
    const item = inMemoryStore[this.collectionName].get(id);
    return item ? { ...item } : null;
  }

  async getAll(filterFn?: (item: T) => boolean): Promise<T[]> {
    if (isRealFirestore && firestoreDb) {
      const snapshot = await firestoreDb.collection(this.collectionName).get();
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      return filterFn ? items.filter(filterFn) : items;
    }
    const items = Array.from(inMemoryStore[this.collectionName].values()) as T[];
    return filterFn ? items.filter(filterFn) : items.map(i => ({ ...i }));
  }

  async create(data: T): Promise<T> {
    if (isRealFirestore && firestoreDb) {
      await firestoreDb.collection(this.collectionName).doc(data.id).set(data);
      return data;
    }
    inMemoryStore[this.collectionName].set(data.id, { ...data });
    return data;
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    if (isRealFirestore && firestoreDb) {
      const docRef = firestoreDb.collection(this.collectionName).doc(id);
      await docRef.update(updates as any);
      const updated = await docRef.get();
      return { id: updated.id, ...updated.data() } as T;
    }
    const current = inMemoryStore[this.collectionName].get(id);
    if (!current) return null;
    const updated = { ...current, ...updates };
    inMemoryStore[this.collectionName].set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    if (isRealFirestore && firestoreDb) {
      await firestoreDb.collection(this.collectionName).doc(id).delete();
      return true;
    }
    return inMemoryStore[this.collectionName].delete(id);
  }

  async clear(): Promise<void> {
    if (isRealFirestore && firestoreDb) {
      const snapshot = await firestoreDb.collection(this.collectionName).get();
      const batch = firestoreDb.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      return;
    }
    inMemoryStore[this.collectionName].clear();
  }
}
