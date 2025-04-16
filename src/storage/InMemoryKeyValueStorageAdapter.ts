import { KeyValueStorageAdapter } from './KeyValueStorageAdapter';

/**
 * In-memory implementation of the key-value storage adapter
 */
export class InMemoryKeyValueStorageAdapter implements KeyValueStorageAdapter {
  private storage: Map<string, string>;

  constructor() {
    this.storage = new Map<string, string>();
  }

  /**
   * Get a value from storage
   * @param key The key to get
   * @returns The value, or null if not found
   */
  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  /**
   * Set a value in storage
   * @param key The key to set
   * @param value The value to set
   */
  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  /**
   * Delete a value from storage
   * @param key The key to delete
   */
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * List all keys with a prefix
   * @param prefix The prefix to list
   * @returns Array of keys
   */
  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    for (const key of this.storage.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }
}
