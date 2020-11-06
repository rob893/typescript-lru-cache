export class LRUCacheNode<T> {
  public key: string;

  public value: T;

  public next: LRUCacheNode<T> | null;

  public prev: LRUCacheNode<T> | null;

  public expires: Date | null = null;

  public constructor(key: string, value: T, next: LRUCacheNode<T> | null = null, prev: LRUCacheNode<T> | null = null) {
    this.key = key;
    this.value = value;
    this.next = next;
    this.prev = prev;
  }
}
