// src/composables/useIndexedDB.js
import { openDB } from 'idb'

const DB_NAME = 'nb4u-ai-database'
const STORE_NAME = 'memories'
const DB_VERSION = 1

let dbPromise = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      // *** Removed unused '_transaction' parameter ***
      upgrade(db, oldVersion, newVersion) {
        console.log(`[useIndexedDB] Upgrading DB from version ${oldVersion} to ${newVersion}`)
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.log(`[useIndexedDB] Creating '${STORE_NAME}' object store.`)
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'memoryId' })
          store.createIndex('timestamp', 'timestamp')
          console.log(`[useIndexedDB] Created index 'timestamp' on '${STORE_NAME}'.`)
        }
      },
    })
    dbPromise
      .then(() => {
        console.log(
          `[useIndexedDB] Database '${DB_NAME}' version ${DB_VERSION} opened successfully.`,
        )
      })
      .catch((error) => {
        console.error(`[useIndexedDB] Failed to open database:`, error)
        dbPromise = null
      })
  }
  return dbPromise
}

export async function getAllMemories() {
  try {
    const db = await getDb()
    if (!db) throw new Error('Database connection not available.')
    return await db.getAll(STORE_NAME)
  } catch (error) {
    console.error('[useIndexedDB] Error getting all memories:', error)
    return []
  }
}

export async function saveMemory(memory) {
  if (!memory || !memory.memoryId) {
    return Promise.reject('Invalid memory object: missing memoryId')
  }
  try {
    const db = await getDb()
    if (!db) throw new Error('Database connection not available.')
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await tx.store.put(memory)
    await tx.done
  } catch (error) {
    console.error(`[useIndexedDB] Error saving memory ${memory.memoryId}:`, error)
    throw error
  }
}

export async function deleteMemoryDB(memoryId) {
  if (!memoryId) {
    return Promise.reject('Invalid memoryId')
  }
  try {
    const db = await getDb()
    if (!db) throw new Error('Database connection not available.')
    await db.delete(STORE_NAME, memoryId)
  } catch (error) {
    console.error(`[useIndexedDB] Error deleting memory ${memoryId}:`, error)
    throw error
  }
}

export async function clearMemoryStore() {
  try {
    const db = await getDb()
    if (!db) throw new Error('Database connection not available.')
    await db.clear(STORE_NAME)
    console.log(`[useIndexedDB] Cleared all records from '${STORE_NAME}'.`)
  } catch (error) {
    console.error(`[useIndexedDB] Error clearing store '${STORE_NAME}':`, error)
    throw error
  }
}

// getDb(); // Optional: Eager init
