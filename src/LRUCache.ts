import { LRUCacheNode } from './LRUCacheNode';

export interface LRUCacheOptions<TKey, TValue> {
  maxSize?: number;
  entryExpirationTimeInMS?: number | null;
  onEntryEvicted?: (evictedEntry: { key: TKey; value: TValue; isExpired: boolean }) => void;
  onEntryMarkedAsMostRecentlyUsed?: (entry: { key: TKey; value: TValue }) => void;
  clone?: boolean;
  cloneFn?: (value: TValue) => TValue;
}

export interface LRUCacheSetEntryOptions<TKey, TValue> {
  entryExpirationTimeInMS?: number | null;
  onEntryEvicted?: (evictedEntry: { key: TKey; value: TValue; isExpired: boolean }) => void;
  onEntryMarkedAsMostRecentlyUsed?: (entry: { key: TKey; value: TValue }) => void;
  clone?: boolean;
  cloneFn?: (value: TValue) => TValue;
}

export interface LRUCacheEntry<TKey, TValue> {
  key: TKey;
  value: TValue;
}

export class LRUCache<TKey = string, TValue = any> {
  private readonly lookupTable: Map<TKey, LRUCacheNode<TKey, TValue>> = new Map();

  private readonly entryExpirationTimeInMS: number | null;

  private readonly onEntryEvicted?: (evictedEntry: { key: TKey; value: TValue; isExpired: boolean }) => void;

  private readonly onEntryMarkedAsMostRecentlyUsed?: (entry: { key: TKey; value: TValue }) => void;

  private readonly cloneFn?: (value: TValue) => TValue;

  private readonly clone?: boolean;

  private maxSizeInternal: number;

  private head: LRUCacheNode<TKey, TValue> | null = null;

  private tail: LRUCacheNode<TKey, TValue> | null = null;

  /**
   * Creates a new instance of the LRUCache.
   *
   * @param options Additional configuration options for the LRUCache.
   */
  public constructor(options?: LRUCacheOptions<TKey, TValue>) {
    const {
      maxSize = 25,
      entryExpirationTimeInMS = null,
      onEntryEvicted,
      onEntryMarkedAsMostRecentlyUsed,
      cloneFn,
      clone
    } = options ?? {};

    if (Number.isNaN(maxSize) || maxSize <= 0) {
      throw new Error('maxSize must be greater than 0.');
    }

    if (
      typeof entryExpirationTimeInMS === 'number' &&
      (entryExpirationTimeInMS <= 0 || Number.isNaN(entryExpirationTimeInMS))
    ) {
      throw new Error('entryExpirationTimeInMS must either be null (no expiry) or greater than 0');
    }

    this.maxSizeInternal = maxSize;
    this.entryExpirationTimeInMS = entryExpirationTimeInMS;
    this.onEntryEvicted = onEntryEvicted;
    this.onEntryMarkedAsMostRecentlyUsed = onEntryMarkedAsMostRecentlyUsed;
    this.clone = clone;
    this.cloneFn = cloneFn;
  }

  /**
   * Returns the number of entries in the LRUCache object.
   *
   * @returns The number of entries in the cache.
   */
  public get size(): number {
    return this.lookupTable.size;
  }

  /**
   * Returns the number of entries that can still be added to the LRUCache without evicting existing entries.
   *
   * @returns The number of entries that can still be added without evicting existing entries.
   */
  public get remainingSize(): number {
    return this.maxSizeInternal - this.size;
  }

  /**
   * Returns the most recently used (newest) entry in the cache.
   * This will not mark the entry as recently used.
   *
   * @returns The most recently used (newest) entry in the cache.
   */
  public get newest(): LRUCacheEntry<TKey, TValue> | null {
    if (!this.head) {
      return null;
    }

    return this.mapNodeToEntry(this.head);
  }

  /**
   * Returns the least recently used (oldest) entry in the cache.
   * This will not mark the entry as recently used.
   *
   * @returns The least recently used (oldest) entry in the cache.
   */
  public get oldest(): LRUCacheEntry<TKey, TValue> | null {
    if (!this.tail) {
      return null;
    }

    return this.mapNodeToEntry(this.tail);
  }

  /**
   * Returns the max number of entries the LRUCache can hold.
   *
   * @returns The max size for the cache.
   */
  public get maxSize(): number {
    return this.maxSizeInternal;
  }

  /**
   * Sets the maxSize of the cache.
   * This will evict the least recently used entries if needed to reach new maxSize.
   *
   * @param value The new value for maxSize. Must be greater than 0.
   */
  public set maxSize(value: number) {
    if (Number.isNaN(value) || value <= 0) {
      throw new Error('maxSize must be greater than 0.');
    }

    this.maxSizeInternal = value;

    this.enforceSizeLimit();
  }

  /**
   * Sets the value for the key in the LRUCache object. Returns the LRUCache object.
   * This marks the newly added entry as the most recently used entry.
   * If adding the new entry makes the cache size go above maxSize,
   * this will evict the least recently used entries until size is equal to maxSize.
   *
   * @param key The key of the entry.
   * @param value The value to set for the key.
   * @param entryOptions Additional configuration options for the cache entry.
   * @returns The LRUCache instance.
   */
  public set(key: TKey, value: TValue, entryOptions?: LRUCacheSetEntryOptions<TKey, TValue>): LRUCache<TKey, TValue> {
    const currentNodeForKey = this.lookupTable.get(key);

    if (currentNodeForKey) {
      this.removeNodeFromListAndLookupTable(currentNodeForKey);
    }

    const node = new LRUCacheNode(key, value, {
      entryExpirationTimeInMS: this.entryExpirationTimeInMS,
      onEntryEvicted: this.onEntryEvicted,
      onEntryMarkedAsMostRecentlyUsed: this.onEntryMarkedAsMostRecentlyUsed,
      clone: this.clone,
      cloneFn: this.cloneFn,
      ...entryOptions
    });
    this.setNodeAsHead(node);
    this.lookupTable.set(key, node);

    this.enforceSizeLimit();

    return this;
  }

  /**
   * Returns the value associated to the key, or null if there is none or if the entry is expired.
   * If an entry is returned, this marks the returned entry as the most recently used entry.
   *
   * @param key The key of the entry to get.
   * @returns The cached value or null.
   */
  public get(key: TKey): TValue | null {
    const node = this.lookupTable.get(key);

    if (!node) {
      return null;
    }

    if (node.isExpired) {
      this.removeNodeFromListAndLookupTable(node);
      return null;
    }

    this.setNodeAsHead(node);

    return node.value;
  }

  /**
   * Returns the value associated to the key, or null if there is none or if the entry is expired.
   * If an entry is returned, this will not mark the entry as most recently accessed.
   * Useful if a value is needed but the order of the cache should not be changed.
   *
   * @param key The key of the entry to get.
   * @returns The cached value or null.
   */
  public peek(key: TKey): TValue | null {
    const node = this.lookupTable.get(key);

    if (!node) {
      return null;
    }

    if (node.isExpired) {
      this.removeNodeFromListAndLookupTable(node);
      return null;
    }

    return node.value;
  }

  /**
   * Deletes the entry for the passed in key.
   *
   * @param key The key of the entry to delete
   * @returns True if an element in the LRUCache object existed and has been removed,
   * or false if the element does not exist.
   */
  public delete(key: TKey): boolean {
    const node = this.lookupTable.get(key);

    if (!node) {
      return false;
    }

    return this.removeNodeFromListAndLookupTable(node);
  }

  /**
   * Returns a boolean asserting whether a value has been associated to the key in the LRUCache object or not.
   * This does not mark the entry as recently used.
   *
   * @param key The key of the entry to check if exists
   * @returns true if the cache contains the supplied key. False if not.
   */
  public has(key: TKey): boolean {
    return this.lookupTable.has(key);
  }

  /**
   * Removes all entries in the cache.
   */
  public clear(): void {
    this.head = null;
    this.tail = null;
    this.lookupTable.clear();
  }

  /**
   * Searches the cache for an entry matching the passed in condition.
   * Expired entries will be skipped (and removed).
   * If multiply entries in the cache match the condition, the most recently used entry will be returned.
   * If an entry is returned, this marks the returned entry as the most recently used entry.
   *
   * @param condition The condition to apply to each entry in the
   * @returns The first cache entry to match the condition. Null if none match.
   */
  public find(condition: (entry: LRUCacheEntry<TKey, TValue>) => boolean): LRUCacheEntry<TKey, TValue> | null {
    let node = this.head;

    while (node) {
      if (node.isExpired) {
        const next = node.next;
        this.removeNodeFromListAndLookupTable(node);
        node = next;
        continue;
      }

      const entry = this.mapNodeToEntry(node);

      if (condition(entry)) {
        this.setNodeAsHead(node);

        return entry;
      }

      node = node.next;
    }

    return null;
  }

  /**
   * Iterates over and applies the callback function to each entry in the cache.
   * Iterates in order from most recently accessed entry to least recently.
   * Expired entries will be skipped (and removed).
   * No entry will be marked as recently used.
   *
   * @param callback the callback function to apply to the entry
   */
  public forEach(callback: (value: TValue, key: TKey, index: number) => void): void {
    let node = this.head;
    let index = 0;

    while (node) {
      if (node.isExpired) {
        const next = node.next;
        this.removeNodeFromListAndLookupTable(node);
        node = next;
        continue;
      }

      callback(node.value, node.key, index);
      node = node.next;
      index++;
    }
  }

  /**
   * Creates a Generator which can be used with for ... of ... to iterate over the cache values.
   * Iterates in order from most recently accessed entry to least recently.
   * Expired entries will be skipped (and removed).
   * No entry will be marked as accessed.
   *
   * @returns A Generator for the cache values.
   */
  public *values(): Generator<TValue> {
    let node = this.head;

    while (node) {
      if (node.isExpired) {
        const next = node.next;
        this.removeNodeFromListAndLookupTable(node);
        node = next;
        continue;
      }

      yield node.value;
      node = node.next;
    }
  }

  /**
   * Creates a Generator which can be used with for ... of ... to iterate over the cache keys.
   * Iterates in order from most recently accessed entry to least recently.
   * Expired entries will be skipped (and removed).
   * No entry will be marked as accessed.
   *
   * @returns A Generator for the cache keys.
   */
  public *keys(): Generator<TKey> {
    let node = this.head;

    while (node) {
      if (node.isExpired) {
        const next = node.next;
        this.removeNodeFromListAndLookupTable(node);
        node = next;
        continue;
      }

      yield node.key;
      node = node.next;
    }
  }

  /**
   * Creates a Generator which can be used with for ... of ... to iterate over the cache entries.
   * Iterates in order from most recently accessed entry to least recently.
   * Expired entries will be skipped (and removed).
   * No entry will be marked as accessed.
   *
   * @returns A Generator for the cache entries.
   */
  public *entries(): Generator<LRUCacheEntry<TKey, TValue>> {
    let node = this.head;

    while (node) {
      if (node.isExpired) {
        const next = node.next;
        this.removeNodeFromListAndLookupTable(node);
        node = next;
        continue;
      }

      yield this.mapNodeToEntry(node);
      node = node.next;
    }
  }

  /**
   * Creates a Generator which can be used with for ... of ... to iterate over the cache entries.
   * Iterates in order from most recently accessed entry to least recently.
   * Expired entries will be skipped (and removed).
   * No entry will be marked as accessed.
   *
   * @returns A Generator for the cache entries.
   */
  public *[Symbol.iterator](): Generator<LRUCacheEntry<TKey, TValue>> {
    let node = this.head;

    while (node) {
      if (node.isExpired) {
        const next = node.next;
        this.removeNodeFromListAndLookupTable(node);
        node = next;
        continue;
      }

      yield this.mapNodeToEntry(node);
      node = node.next;
    }
  }

  private enforceSizeLimit(): void {
    let node = this.tail;

    while (node !== null && this.size > this.maxSizeInternal) {
      const prev = node.prev;
      this.removeNodeFromListAndLookupTable(node);
      node = prev;
    }
  }

  private mapNodeToEntry({ key, value }: LRUCacheNode<TKey, TValue>): LRUCacheEntry<TKey, TValue> {
    return {
      key,
      value
    };
  }

  private setNodeAsHead(node: LRUCacheNode<TKey, TValue>): void {
    this.removeNodeFromList(node);

    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }

    node.invokeOnEntryMarkedAsMostRecentlyUsed();
  }

  private removeNodeFromList(node: LRUCacheNode<TKey, TValue>): void {
    if (node.prev !== null) {
      node.prev.next = node.next;
    }

    if (node.next !== null) {
      node.next.prev = node.prev;
    }

    if (this.head === node) {
      this.head = node.next;
    }

    if (this.tail === node) {
      this.tail = node.prev;
    }

    node.next = null;
    node.prev = null;
  }

  private removeNodeFromListAndLookupTable(node: LRUCacheNode<TKey, TValue>): boolean {
    node.invokeOnEvicted();
    this.removeNodeFromList(node);

    return this.lookupTable.delete(node.key);
  }
}
