import { LRUCache } from '../LRUCache';

describe('LRUCache', () => {
  describe('constructor', () => {
    it('should create an instance of LRUCache', () => {
      const cache = new LRUCache();

      expect(cache).toBeInstanceOf(LRUCache);
    });

    it('should set maxSize to 25 by default', () => {
      const cache = new LRUCache();

      expect(cache.maxSize).toBe(25);
    });

    it('should set entryExpirationTimeInMS to null by default', () => {
      const cache = new LRUCache();

      expect((cache as any).entryExpirationTimeInMS).toBeNull();
    });

    it('should accept a configuration object', () => {
      const maxSize = 10;
      const cache = new LRUCache({ maxSize });

      expect(cache.maxSize).toBe(maxSize);
    });

    it.each([-1, 0, NaN, -12342])('should throw when passed an invalid maxSize', maxSize => {
      expect(() => new LRUCache({ maxSize })).toThrow();
    });

    it.each([-1, 0, NaN, -12342])(
      'should throw when passed an invalid entryExpirationTimeInMS',
      entryExpirationTimeInMS => {
        expect(() => new LRUCache({ entryExpirationTimeInMS })).toThrow();
      }
    );
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

  describe('clear', () => {
    it('should clear a full cache', () => {
      const cache = new LRUCache();

      for (let i = 0; i < cache.maxSize; i++) {
        cache.set(`${i}`, i);
      }

      expect(cache.size).toBe(cache.maxSize);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.remainingSize).toBe(cache.maxSize);
      expect((cache as any).head).toBeNull();
      expect((cache as any).tail).toBeNull();
    });

    it('should clear an empty cache', () => {
      const cache = new LRUCache();

      expect(cache.size).toBe(0);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.remainingSize).toBe(cache.maxSize);
      expect((cache as any).head).toBeNull();
      expect((cache as any).tail).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for a value in the cache', () => {
      const cache = new LRUCache();
      const key = 'test-key';

      cache.set(key, 'test');

      const result = cache.has(key);

      expect(result).toBe(true);
    });

    it('should return false for an empty cache', () => {
      const cache = new LRUCache();
      const key = 'test-key';

      const result = cache.has(key);

      expect(result).toBe(false);
    });

    it('should return false for an entry not in cache', () => {
      const cache = new LRUCache();
      const key = 'test-key';

      cache.set('notTheTestKey', 'some value');

      const result = cache.has(key);

      expect(result).toBe(false);
    });

    it('should return false for an entry that was evicted for non-use', () => {
      const cache = new LRUCache({ maxSize: 2 });
      const key = 'test-key';

      cache.set(key, 'some value');
      cache.set('key2', 'some value2');
      cache.set('key3', 'some value3');

      const result = cache.has(key);

      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should return null for key not found in cache', () => {
      const cache = new LRUCache();

      const result = cache.get('test');

      expect(result).toBeNull();
    });

    it('should return null for expired item', () => {
      const cache = new LRUCache({ entryExpirationTimeInMS: 10000 });
      const key = 'test-key';

      cache.set(key, 'value');

      // force expiration
      (cache as any).head.created = 0;

      const result = cache.get(key);

      expect(result).toBeNull();
    });

    it('should purge expired item', () => {
      const cache = new LRUCache({ entryExpirationTimeInMS: 10000 });
      const key = 'test-key';

      cache.set(key, 'value');

      // force expiration
      (cache as any).head.created = 0;

      cache.get(key);

      const { head, tail, size } = cache as any;

      expect(head).toBeNull();
      expect(tail).toBeNull();
      expect(size).toBe(0);
    });

    it('should return the value for a given key', () => {
      const cache = new LRUCache();
      const key = 'test-key';
      const value = 'test-value';

      cache.set(key, value);

      const result = cache.get(key);

      expect(result).toEqual(value);
    });

    it('should make the most recently accessed item the head of list', () => {
      const cache = new LRUCache();
      const key = 'test-key';
      const value = 'test-value';

      cache.set(key, value);
      cache.set('test2', 'test2Value');
      cache.set('test3', 'test3');

      cache.get(key);

      const { key: nodeKey, value: nodeValue } = (cache as any).head;

      expect(nodeKey).toBe(key);
      expect(nodeValue).toBe(value);
    });
  });

  describe('find', () => {
    it('should find an entry that matches the condition', () => {
      const cache = new LRUCache<string, string>();

      cache.set('key1', 'some value1');
      cache.set('key2', 'some value2');
      cache.set('key3', 'some value3');

      const result = cache.find(entry => entry.value.includes('value2'));

      expect(result?.key).toBe('key2');
      expect(result?.value).toBe('some value2');
    });

    it('should find the most recently accessed entry matching the condition', () => {
      const cache = new LRUCache<string, string>();

      // Configure 3 items that will match condition
      cache.set('key1', 'some value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'some value2');
      cache.set('key4', 'some other value2');

      // key 4 will be most recently used item as it was last set
      expect((cache as any).head.key).toBe('key4');

      // access key3 to make it most recently used
      cache.get('key3');

      const result = cache.find(entry => entry.value.includes('value2'));

      expect(result?.key).toBe('key3');
      expect(result?.value).toBe('some value2');
    });

    it('should return null for nothing matching condition', () => {
      const cache = new LRUCache<string, string>();
      cache.set('key1', 'some value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'some value2');
      cache.set('key4', 'some other value2');

      const result = cache.find(entry => entry.value.includes('will not find anything'));

      expect(result).toBeNull();
    });

    it('should return null for matched entry being expired', () => {
      const cache = new LRUCache<string, string>({ entryExpirationTimeInMS: 10000 });
      cache.set('key1', 'some value1');
      cache.set('key2', 'value2');

      const ensureFound = cache.find(entry => entry.value.includes('value2'));

      expect(ensureFound).not.toBeNull();
      expect(cache.size).toBe(2);

      // force expiration
      (cache as any).head.created = 0;

      const result = cache.find(entry => entry.value.includes('value2'));

      expect(result).toBeNull();
      expect(cache.size).toBe(1);
    });

    it('should return first non-expired result and prune expired items', () => {
      const cache = new LRUCache<string, string>({ entryExpirationTimeInMS: 10000 });
      cache.set('key1', 'some value2');
      cache.set('key2', 'value2');

      const ensureFound = cache.find(entry => entry.value.includes('value2'));

      expect(ensureFound).not.toBeNull();
      expect(cache.size).toBe(2);

      // force expiration
      (cache as any).head.created = 0;

      const result = cache.find(entry => entry.value.includes('value2'));

      expect(result?.key).toBe('key1');
      expect(result?.value).toBe('some value2');
    });
  });

  describe('forEach', () => {
    it('should have 0 iterations due to empty cache', () => {
      const cache = new LRUCache();

      let i = 0;

      cache.forEach(() => i++);

      expect(i).toBe(0);
    });

    it('should have maxSize iterations due to full cache', () => {
      const cache = new LRUCache();

      for (let i = 0; i < cache.maxSize; i++) {
        cache.set(`${i}`, i);
      }

      let i = 0;

      cache.forEach(() => i++);

      expect(i).toBe(cache.maxSize);
    });
  });

  describe('iterator', () => {
    it('should iterate 0 times due to empty cache', () => {
      const cache = new LRUCache();

      let i = 0;
      for (const _entry of cache) {
        i++;
      }

      expect(i).toBe(0);
    });

    it('should iterate maxSize times due to full cache', () => {
      const cache = new LRUCache();

      for (let i = 0; i < cache.maxSize; i++) {
        cache.set(`${i}`, i);
      }

      let i = 0;
      for (const _entry of cache) {
        i++;
      }

      expect(i).toBe(cache.maxSize);
    });
  });

  describe('keys', () => {
    it('should iterate 0 times due to empty cache', () => {
      const cache = new LRUCache();

      let i = 0;
      for (const _key of cache.keys()) {
        i++;
      }

      expect(i).toBe(0);
    });

    it('should iterate maxSize times due to full cache', () => {
      const cache = new LRUCache();

      for (let i = 0; i < cache.maxSize; i++) {
        cache.set(`${i}`, i);
      }

      let i = 0;
      for (const _key of cache.keys()) {
        i++;
      }

      expect(i).toBe(cache.maxSize);
    });
  });

  describe('entries', () => {
    it('should iterate 0 times due to empty cache', () => {
      const cache = new LRUCache();

      let i = 0;
      for (const _entry of cache.entries()) {
        i++;
      }

      expect(i).toBe(0);
    });

    it('should iterate maxSize times due to full cache', () => {
      const cache = new LRUCache();

      for (let i = 0; i < cache.maxSize; i++) {
        cache.set(`${i}`, i);
      }

      let i = 0;
      for (const _entry of cache.entries()) {
        i++;
      }

      expect(i).toBe(cache.maxSize);
    });
  });

  describe('values', () => {
    it('should iterate 0 times due to empty cache', () => {
      const cache = new LRUCache();

      let i = 0;
      for (const _values of cache.values()) {
        i++;
      }

      expect(i).toBe(0);
    });

    it('should iterate maxSize times due to full cache', () => {
      const cache = new LRUCache();

      for (let i = 0; i < cache.maxSize; i++) {
        cache.set(`${i}`, i);
      }

      let i = 0;
      for (const _values of cache.values()) {
        i++;
      }

      expect(i).toBe(cache.maxSize);
    });
  });
});
