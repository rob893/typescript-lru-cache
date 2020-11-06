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

  private readonly lookup: Map<TKey, LRUCacheNode<TKey, TValue>> = new Map();

  private readonly entryExpirationTimeInMS: number | null;

  private head: LRUCacheNode<TKey, TValue> | null = null;

  private tail: LRUCacheNode<TKey, TValue> | null = null;

  public constructor(options?: LRUCacheOptions) {
    const { maxSize = 25, entryExpirationTimeInMS = null } = options || {};

    this.maxSize = maxSize;
    this.entryExpirationTimeInMS = entryExpirationTimeInMS;
  }

  /**
   * Returns the number of entries in the LRUCache object.
   */
  public get size(): number {
    return this.lookup.size;
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

    if (!this.head) {
      const node = new LRUCacheNode(key, value);
      this.head = node;
      this.tail = node;
    } else {
      const node = new LRUCacheNode(key, value, this.head);
      this.head.prev = node;
      this.head = node;
    }

    this.lookup.set(key, this.head);

    return this;
  }

  /**
   * Returns the value associated to the key, or null if there is none or if the entry is expired.
   *
   * @param key The key of the entry to get
   */
  public get<TResult = TValue>(key: TKey): TResult | null {
    const node = this.lookup.get(key);

    if (node) {
      const { value, created } = node;
      this.delete(key);

      if (this.entryExpirationTimeInMS && Date.now() - created > this.entryExpirationTimeInMS) {
        return null;
      }

      this.set(key, value);

      return (value as unknown) as TResult;
    }

    return null;
  }

  /**
   * Returns true if an element in the LRUCache object existed and has been removed,
   * or false if the element does not exist.
   *
   * @param key The key of the entry to delete
   */
  public delete(key: TKey): boolean {
    const node = this.lookup.get(key);

    if (!node) {
      return false;
    }

    if (node.prev !== null) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next !== null) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    return this.lookup.delete(key);
  }

  /**
   * Returns a boolean asserting whether a value has been associated to the key in the LRUCache object or not.
   *
   * @param key The key of the entry to check if exists
   */
  public has(key: TKey): boolean {
    return this.lookup.has(key);
  }

  /**
   * Removes all entries in the cache.
   */
  public clear(): void {
    this.head = null;
    this.tail = null;
    this.lookup.clear();
  }

  public find(fn: (entry: LRUCacheEntry<TKey, TValue>) => boolean): LRUCacheEntry<TKey, TValue> | null {
    let node = this.head;

    while (node) {
      const entry = this.mapNodeToEntry(node);
      if (fn(entry)) {
        return entry;
      }
    }

    return null;
  }

  public forEach(fn: (value: TValue, key: TKey, index: number) => void): void {
    let node = this.head;
    let index = 0;

    while (node) {
      fn(node.value, node.key, index);
      node = node.next;
      index++;
    }
  }

  public *values(): Iterable<TValue> {
    let node = this.head;

    while (node) {
      yield node.value;
      node = node.next;
    }
  }

  public *keys(): Iterable<TKey> {
    let node = this.head;

    while (node) {
      yield node.key;
      node = node.next;
    }
  }

  public *entries(): Iterable<LRUCacheEntry<TKey, TValue>> {
    let node = this.head;

    while (node) {
      yield this.mapNodeToEntry(node);
      node = node.next;
    }
  }

  public *[Symbol.iterator](): Iterable<LRUCacheEntry<TKey, TValue>> {
    let node = this.head;

    while (node) {
      yield this.mapNodeToEntry(node);
      node = node.next;
    }
  }

  private enforceSizeLimit(): void {
    if (this.size === this.maxSize) {
      if (!this.tail) {
        throw new Error('Something went wrong');
      }

      this.delete(this.tail.key);
    }
  }

  private mapNodeToEntry({ key, value }: LRUCacheNode<TKey, TValue>): LRUCacheEntry<TKey, TValue> {
    return {
      key,
      value
    };
  }
}
