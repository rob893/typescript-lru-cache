export interface LRUCacheNodeOptions<TKey, TValue> {
  next?: LRUCacheNode<TKey, TValue> | null;
  prev?: LRUCacheNode<TKey, TValue> | null;
  entryExpirationTimeInMS?: number | null;
}

export class LRUCacheNode<TKey, TValue> {
  public readonly key: TKey;

  public readonly value: TValue;

  public readonly created: number;

  public readonly entryExpirationTimeInMS: number | null;

  public next: LRUCacheNode<TKey, TValue> | null;

  public prev: LRUCacheNode<TKey, TValue> | null;

  public constructor(key: TKey, value: TValue, options?: LRUCacheNodeOptions<TKey, TValue>) {
    const { entryExpirationTimeInMS = null, next = null, prev = null } = options || {};

    if (
      typeof entryExpirationTimeInMS === 'number' &&
      (entryExpirationTimeInMS <= 0 || Number.isNaN(entryExpirationTimeInMS))
    ) {
      throw new Error('entryExpirationTimeInMS must either be null (no expiry) or greater than 0');
    }

    this.key = key;
    this.value = value;
    this.created = Date.now();
    this.entryExpirationTimeInMS = entryExpirationTimeInMS;
    this.next = next;
    this.prev = prev;
  }

  public get isExpired(): boolean {
    return typeof this.entryExpirationTimeInMS === 'number' && Date.now() - this.created > this.entryExpirationTimeInMS;
  }
}
