import { LRUCache } from '../LRUCache';

describe('LRUCache', () => {
  describe('constructor', () => {
    it('should create an instance of LRUCache', () => {
      const cache = new LRUCache();

      expect(cache).toBeInstanceOf(LRUCache);
    });
  });

  describe('size', () => {
    it('should be 0 due to no cached items', () => {
      const { size } = new LRUCache();

      expect(size).toBe(0);
    });

    it('should be 1 due to a single cached item', () => {
      const cache = new LRUCache();
      cache.set('test', 0);

      expect(cache.size).toBe(1);
    });

    it('should adjust correctly when adding several items', () => {
      const cache = new LRUCache();

      expect(cache.size).toBe(0);

      cache.set('1', 0);

      expect(cache.size).toBe(1);

      cache.set('2', 0);

      expect(cache.size).toBe(2);
    });

    it('should never go above maxSize', () => {
      const cache = new LRUCache();

      for (let i = 0; i < cache.maxSize * 5; i++) {
        cache.set(`${i}`, i);
      }

      expect(cache.size).toBe(cache.maxSize);
    });

    it('should have the same size as number of internal nodes', () => {
      const cache = new LRUCache();

      for (let i = 0; i < cache.maxSize * 5; i++) {
        cache.set(`${i}`, i);
      }

      let numNodes = 0;
      let node = (cache as any).head;

      while (node) {
        numNodes++;
        node = node.next;
      }

      expect(cache.size).toBe(cache.maxSize);
      expect(numNodes).toBe(cache.maxSize);
    });
  });

  describe('remainingSize', () => {
    it('should be maxSize due to no entries', () => {
      const { remainingSize, maxSize } = new LRUCache();

      expect(remainingSize).toBe(maxSize);
    });

    it('should be 0 due to LRUCache being filled', () => {
      const cache = new LRUCache();

      for (let i = 0; i < cache.maxSize * 5; i++) {
        cache.set(`${i}`, i);
      }

      expect(cache.remainingSize).toBe(0);
    });

    it('should adjust correctly when adding several items', () => {
      const cache = new LRUCache();

      expect(cache.remainingSize).toBe(cache.maxSize);

      cache.set('1', 0);

      expect(cache.remainingSize).toBe(cache.maxSize - 1);

      cache.set('2', 0);

      expect(cache.remainingSize).toBe(cache.maxSize - 2);
    });
  });
});
