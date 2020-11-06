import { LRUCacheNode } from './LRUCacheNode';

export class LRUCache<T = any> {
  public readonly maxSize: number = 25;

  private readonly lookup: Map<string, LRUCacheNode<T>> = new Map();

  private head: LRUCacheNode<T> | null = null;

  private tail: LRUCacheNode<T> | null = null;

  private size: number = 0;

  public get currentSize(): number {
    return this.size;
  }

  public get remainingSize(): number {
    return this.maxSize - this.size;
  }

  public set(key: string, value: T): void {
    this.ensureLimit();

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
    this.size++;
  }

  public read<TResult = T>(key: string): TResult | null {
    const node = this.lookup.get(key);

    if (node) {
      const { value } = node;

      // node removed from it's position and cache
      this.remove(key);
      // write node again to the head of LinkedList to make it most recently used
      this.set(key, value);

      return (value as unknown) as TResult;
    }

    return null;
  }

  public clear(): void {
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.lookup.clear();
  }

  public forEach(fn: (node: LRUCacheNode<T>, index: number) => void): void {
    let node = this.head;
    let index = 0;

    while (node) {
      fn(node, index);
      node = node.next;
      index++;
    }
  }

  public *values(): Iterable<T> {
    let node = this.head;

    while (node) {
      yield node.value;
      node = node.next;
    }
  }

  public *keys(): Iterable<string> {
    let node = this.head;

    while (node) {
      yield node.key;
      node = node.next;
    }
  }

  public *[Symbol.iterator](): Iterable<LRUCacheNode<T>> {
    let node = this.head;

    while (node) {
      yield node;
      node = node.next;
    }
  }

  private ensureLimit(): void {
    if (this.size === this.maxSize) {
      if (!this.tail) {
        throw new Error('Something went wrong');
      }

      this.remove(this.tail.key);
    }
  }

  private remove(key: string): void {
    const node = this.lookup.get(key);

    if (!node) {
      throw new Error(`No cached value found for key ${key}`);
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

    this.lookup.delete(key);
    this.size--;
  }
}
