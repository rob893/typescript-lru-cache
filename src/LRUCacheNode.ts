export class LRUCacheNode<TKey, TValue> {
  public readonly key: TKey;

  public readonly value: TValue;

  public readonly created: number;

  public next: LRUCacheNode<TKey, TValue> | null;

  public prev: LRUCacheNode<TKey, TValue> | null;

  public constructor(
    key: TKey,
    value: TValue,
    next: LRUCacheNode<TKey, TValue> | null = null,
    prev: LRUCacheNode<TKey, TValue> | null = null
  ) {
    this.key = key;
    this.value = value;
    this.created = Date.now();
    this.next = next;
    this.prev = prev;
  }
}
