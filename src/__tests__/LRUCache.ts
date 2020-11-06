import { LRUCache } from '../LRUCache';

describe('LRUCache', () => {
  describe('constructor', () => {
    it('should create an instance of LRUCache', () => {
      const cache = new LRUCache();

      expect(cache).toBeInstanceOf(LRUCache);
    });
  });

  describe('currentSize', () => {
    it('should be 0 due to no cached items', () => {
      const { currentSize } = new LRUCache();

      expect(currentSize).toBe(0);
    });

    it('should be 1 due to a single cached item', () => {
      const cache = new LRUCache();
      cache.set('test', 0);

      expect(cache.currentSize).toBe(1);
    });

    it('should adjust correctly when adding several items', () => {
      const cache = new LRUCache();

      expect(cache.currentSize).toBe(0);

      cache.set('1', 0);

      expect(cache.currentSize).toBe(1);

      cache.set('2', 0);

      expect(cache.currentSize).toBe(2);
    });

    it('should never go above maxSize', () => {
      const cache = new LRUCache();

      for (let i = 0; i < cache.maxSize * 2; i++) {
        cache.set(`${i}`, i);
      }

      expect(cache.currentSize).toBe(cache.maxSize);
    });
  });
});
