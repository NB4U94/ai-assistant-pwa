// src/composables/useIndexedDB.js
import { openDB } from 'idb'

const DB_NAME = 'nb4u-ai-database'
const STORE_NAME = 'memories'
const DB_VERSION = 1 // Increment this if schema changes later

let dbPromise = null

// Function to initialize/open the database connection
function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`[useIndexedDB] Upgrading DB from version ${oldVersion} to ${newVersion}`)
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.log(`[useIndexedDB] Creating '${STORE_NAME}' object store.`)
          // Create object store using memoryId as the key
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'memoryId',
          })
          // Create an index on 'timestamp' for potential sorting/querying
          store.createIndex('timestamp', 'timestamp')
          console.log(`[useIndexedDB] Created index 'timestamp' on '${STORE_NAME}'.`)
        }
        // Add other upgrade logic here if DB_VERSION increases in the future
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
        // Reset promise on failure so initialization can be retried
        dbPromise = null
      })
  }
  return dbPromise
}

/**
 * Retrieves all memory objects from the IndexedDB store.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of memory objects.
 */
export async function getAllMemories() {
  try {
    const db = await getDb()
    return await db.getAll(STORE_NAME)
  } catch (error) {
    console.error('[useIndexedDB] Error getting all memories:', error)
    return [] // Return empty array on error
  }
}

/**
 * Saves (adds or updates) a memory object in the IndexedDB store.
 * Uses 'put' which handles both insert and update based on the keyPath.
 * @param {object} memory - The memory object to save. Must contain a unique 'memoryId'.
 * @returns {Promise<void>} A promise that resolves when saving is complete or rejects on error.
 */
export async function saveMemory(memory) {
  if (!memory || !memory.memoryId) {
    console.error('[useIndexedDB] Invalid memory object provided to saveMemory:', memory)
    return Promise.reject('Invalid memory object: missing memoryId')
  }
  try {
    const db = await getDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await tx.store.put(memory) // 'put' adds or updates
    await tx.done // Wait for transaction to complete
    // console.log(`[useIndexedDB] Memory ${memory.memoryId} saved successfully.`); // Optional logging
  } catch (error) {
    console.error(`[useIndexedDB] Error saving memory ${memory.memoryId}:`, error)
    throw error // Re-throw error to be handled by caller if needed
  }
}

/**
 * Deletes a memory object from the IndexedDB store by its ID.
 * @param {string} memoryId - The ID of the memory to delete.
 * @returns {Promise<void>} A promise that resolves when deletion is complete or rejects on error.
 */
export async function deleteMemoryDB(memoryId) {
  // Renamed slightly to avoid conflict if imported directly
  if (!memoryId) {
    console.error('[useIndexedDB] Invalid memoryId provided to deleteMemoryDB:', memoryId)
    return Promise.reject('Invalid memoryId')
  }
  try {
    const db = await getDb()
    await db.delete(STORE_NAME, memoryId)
    // console.log(`[useIndexedDB] Memory ${memoryId} deleted successfully.`); // Optional logging
  } catch (error) {
    console.error(`[useIndexedDB] Error deleting memory ${memoryId}:`, error)
    throw error // Re-throw error
  }
}

// Optional: Initialize DB connection eagerly when module loads
// getDb();
