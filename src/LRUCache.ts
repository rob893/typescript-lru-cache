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
  /**
   * Returns the max number of entries the LRUCache can hold.
   */
  public readonly maxSize: number;

  private readonly lookupTable: Map<TKey, LRUCacheNode<TKey, TValue>> = new Map();

  private readonly entryExpirationTimeInMS: number | null;

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

    this.maxSize = maxSize;
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
    return this.maxSize - this.size;
  }

  /**
   * Sets the value for the key in the LRUCache object. Returns the LRUCache object.
   *
   * @param key The key of the entry
   * @param value The value to set for the key
   */
  public set(key: TKey, value: TValue): LRUCache<TKey, TValue> {
    this.enforceSizeLimit();
    const node = new LRUCacheNode(key, value);
    this.setNodeAsHead(node);
    this.lookupTable.set(key, node);

    return this;
  }

  /**
   * Returns the value associated to the key, or null if there is none or if the entry is expired.
   *
   * @param key The key of the entry to get
   */
  public get<TResult = TValue>(key: TKey): TResult | null {
    const node = this.lookupTable.get(key);

    if (!node) {
      return null;
    }

    if (this.isNodeExpired(node)) {
      this.removeNodeFromListAndLookupTable(node);
      return null;
    }

    this.setNodeAsHead(node);

    return (node.value as unknown) as TResult;
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

  public find(fn: (entry: LRUCacheEntry<TKey, TValue>) => boolean): LRUCacheEntry<TKey, TValue> | null {
    let node = this.head;

    while (node) {
      if (this.isNodeExpired(node)) {
        this.removeNodeFromListAndLookupTable(node);
        node = node.next;
        continue;
      }

      const entry = this.mapNodeToEntry(node);

      if (fn(entry)) {
        this.setNodeAsHead(node);

        return entry;
      }

      node = node.next;
    }

    return null;
  }

  public forEach(fn: (value: TValue, key: TKey, index: number) => void): void {
    let node = this.head;
    let index = 0;

    while (node) {
      if (this.isNodeExpired(node)) {
        this.removeNodeFromListAndLookupTable(node);
        node = node.next;
        continue;
      }

      fn(node.value, node.key, index);
      node = node.next;
      index++;
    }
  }

  public *values(): Generator<TValue> {
    let node = this.head;

    while (node) {
      if (this.isNodeExpired(node)) {
        this.removeNodeFromListAndLookupTable(node);
        node = node.next;
        continue;
      }

      yield node.value;
      node = node.next;
    }
  }

  public *keys(): Generator<TKey> {
    let node = this.head;

    while (node) {
      if (this.isNodeExpired(node)) {
        this.removeNodeFromListAndLookupTable(node);
        node = node.next;
        continue;
      }

      yield node.key;
      node = node.next;
    }
  }

  public *entries(): Generator<LRUCacheEntry<TKey, TValue>> {
    let node = this.head;

    while (node) {
      if (this.isNodeExpired(node)) {
        this.removeNodeFromListAndLookupTable(node);
        node = node.next;
        continue;
      }

      yield this.mapNodeToEntry(node);
      node = node.next;
    }
  }

  public *[Symbol.iterator](): Generator<LRUCacheEntry<TKey, TValue>> {
    let node = this.head;

    while (node) {
      if (this.isNodeExpired(node)) {
        this.removeNodeFromListAndLookupTable(node);
        node = node.next;
        continue;
      }

      yield this.mapNodeToEntry(node);
      node = node.next;
    }
  }

  private enforceSizeLimit(): void {
    if (this.size === this.maxSize) {
      if (!this.tail) {
        throw new Error('Something went wrong');
      }

      this.removeNodeFromListAndLookupTable(this.tail);
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

    if (this.head === node) {
      this.head = node.next;
    }

    if (node.next !== null) {
      node.next.prev = node.prev;
    }

    if (this.tail === node) {
      this.tail = node.prev;
    }
  }

  private removeNodeFromListAndLookupTable(node: LRUCacheNode<TKey, TValue>): boolean {
    this.removeNodeFromList(node);

    return this.lookupTable.delete(node.key);
  }
}
