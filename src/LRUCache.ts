import { LRUCacheNode } from './LRUCacheNode';

export interface LRUCacheOptions {
  maxSize?: number;
  entryExpirationTimeInMS?: number | null;
}

export interface LRUCacheEntry<TKey, TValue> {
  key: TKey;
  value: TValue;
}

export class LRUCache<TKey = string, TValue = any> {
  private readonly lookupTable: Map<TKey, LRUCacheNode<TKey, TValue>> = new Map();

  private readonly entryExpirationTimeInMS: number | null;

  private maxSizeInternal: number;

  private head: LRUCacheNode<TKey, TValue> | null = null;

  private tail: LRUCacheNode<TKey, TValue> | null = null;

  public constructor(options?: LRUCacheOptions) {
    const { maxSize = 25, entryExpirationTimeInMS = null } = options || {};

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
  }

  /**
   * Returns the number of entries in the LRUCache object.
   */
  public get size(): number {
    return this.lookupTable.size;
  }

  /**
   * Returns the number of entries that can still be added to the LRUCache without evicting existing entries.
   */
  public get remainingSize(): number {
    return this.maxSizeInternal - this.size;
  }

  /**
   * Returns the newest entry in the cache.
   * This will not mark the entry as recently used.
   */
  public get newest(): LRUCacheEntry<TKey, TValue> | null {
    if (!this.head) {
      return null;
    }

    return this.mapNodeToEntry(this.head);
  }

  /**
   * Returns the oldest entry in the cache.
   * This will not mark the entry as recently used.
   */
  public get oldest(): LRUCacheEntry<TKey, TValue> | null {
    if (!this.tail) {
      return null;
    }

    return this.mapNodeToEntry(this.tail);
  }

  /**
   * Returns the max number of entries the LRUCache can hold.
   */
  public get maxSize(): number {
    return this.maxSizeInternal;
  }

  /**
   * Sets the maxSize of the cache.
   * This will evict the least recently used entries if needed to reach new maxSize.
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
   * @param key The key of the entry
   * @param value The value to set for the key
   */
  public set(key: TKey, value: TValue): LRUCache<TKey, TValue> {
    const currentNodeForKey = this.lookupTable.get(key);

    if (currentNodeForKey) {
      this.removeNodeFromListAndLookupTable(currentNodeForKey);
    }

    const node = new LRUCacheNode(key, value);
    this.setNodeAsHead(node);
    this.lookupTable.set(key, node);

    this.enforceSizeLimit();

    return this;
  }

  /**
   * Returns the value associated to the key, or null if there is none or if the entry is expired.
   * If an entry is returned, this marks the returned entry as the most recently used entry.
   *
   * @param key The key of the entry to get
   */
  public get(key: TKey): TValue | null {
    const node = this.lookupTable.get(key);

    if (!node) {
      return null;
    }

    if (this.isNodeExpired(node)) {
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
   * @param key The key of the entry to get
   */
  public peek(key: TKey): TValue | null {
    const node = this.lookupTable.get(key);

    if (!node) {
      return null;
    }

    if (this.isNodeExpired(node)) {
      this.removeNodeFromListAndLookupTable(node);
      return null;
    }

    return node.value;
  }

  /**
   * Returns true if an element in the LRUCache object existed and has been removed,
   * or false if the element does not exist.
   *
   * @param key The key of the entry to delete
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
   * Searchs the cache for an entry matching the passed in condition.
   * If multiply entries in the cache match the condition, the most recently used entry will be returned.
   * If an entry is returned, this marks the returned entry as the most recently used entry.
   *
   * @param condition The condition to apply to each entry in the
   */
  public find(condition: (entry: LRUCacheEntry<TKey, TValue>) => boolean): LRUCacheEntry<TKey, TValue> | null {
    let node = this.head;

    while (node) {
      if (this.isNodeExpired(node)) {
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
   * Expired entries will be skipped.
   * No entry will be marked as accessed.
   *
   * @param callback the callback function to apply to the entry
   */
  public forEach(callback: (value: TValue, key: TKey, index: number) => void): void {
    let node = this.head;
    let index = 0;

    while (node) {
      if (this.isNodeExpired(node)) {
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
   * Expired entries will be skipped.
   * No entry will be marked as accessed.
   */
  public *values(): Generator<TValue> {
    let node = this.head;

    while (node) {
      if (this.isNodeExpired(node)) {
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
   * Expired entries will be skipped.
   * No entry will be marked as accessed.
   */
  public *keys(): Generator<TKey> {
    let node = this.head;

    while (node) {
      if (this.isNodeExpired(node)) {
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
   * Expired entries will be skipped.
   * No entry will be marked as accessed.
   */
  public *entries(): Generator<LRUCacheEntry<TKey, TValue>> {
    let node = this.head;

    while (node) {
      if (this.isNodeExpired(node)) {
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
   * Expired entries will be skipped.
   * No entry will be marked as accessed.
   */
  public *[Symbol.iterator](): Generator<LRUCacheEntry<TKey, TValue>> {
    let node = this.head;

    while (node) {
      if (this.isNodeExpired(node)) {
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

  private isNodeExpired({ created }: LRUCacheNode<TKey, TValue>): boolean {
    return typeof this.entryExpirationTimeInMS === 'number' && Date.now() - created > this.entryExpirationTimeInMS;
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
    this.removeNodeFromList(node);

    return this.lookupTable.delete(node.key);
  }
}
