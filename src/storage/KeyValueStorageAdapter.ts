/**
 * Interface for key-value storage adapters
 */
export interface KeyValueStorageAdapter {
  /**
   * Get a value from storage
   * @param key The key to get
   * @returns The value, or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value in storage
   * @param key The key to set
   * @param value The value to set
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Delete a value from storage
   * @param key The key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * List all keys with a prefix
   * @param prefix The prefix to list
   * @returns Array of keys
   */
  list(prefix: string): Promise<string[]>;
}
