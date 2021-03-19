import { LRUCache, LRUCacheEntry } from '../LRUCache';

function validateCacheInternals(cache: LRUCache): void {
  let node = (cache as any).head;

  let i = 0;

  const visited = new Set();

  while (node) {
    if (!(cache as any).lookupTable.has(node.key)) {
      throw new Error(
        `Internal table does not have key ${node.key} however it is in the internal list. Stray node detected`
      );
    }

    if (visited.has(node)) {
      throw new Error(`Processed node with key ${node.key} twice. Circular reference detected`);
    } else {
      visited.add(node);
    }

    i++;
    node = node.next;

    if (i > cache.maxSize * 2) {
      throw new Error(`Internal list size has exceeded the cache maxSize of ${cache.maxSize}`);
    }
  }

  if (i !== cache.size) {
    throw new Error(`Internal list size of ${i} does not match size of internal table of ${cache.size}`);
  }
}

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

    it('should use passed in cloneFn when clone set to true', () => {
      const cloneFn = jest.fn(value => value);
      const cache = new LRUCache({ clone: true, cloneFn });

      cache.set('key', 'value');
      const result = cache.get('key');

      expect(cloneFn).toHaveBeenCalledTimes(2);
      expect(result).toBe('value');
    });

    it('should use passed in cloneFn to set over constructor', () => {
      const cloneFn = jest.fn(value => value);
      const cloneFn2 = jest.fn(value => value);
      const cache = new LRUCache({ clone: true, cloneFn });

      cache.set('key', 'value', { cloneFn: cloneFn2 });
      const result = cache.get('key');

      expect(cloneFn).not.toHaveBeenCalled();
      expect(cloneFn2).toHaveBeenCalledTimes(2);
      expect(result).toBe('value');
    });

    it('should not call cloneFn when set uses false', () => {
      const cloneFn = jest.fn(value => value);
      const cache = new LRUCache({ clone: true, cloneFn });
      const key = 'key';
      const value = { foo: 'bar' };

      cache.set(key, value, { clone: false });
      const result = cache.get(key);

      expect(cloneFn).not.toHaveBeenCalled();
      expect(result).toBe(value);
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

  describe('newest', () => {
    it('should return null for empty cache', () => {
      const cache = new LRUCache();

      expect(cache.newest).toBeNull();
    });

    it('should return the newest entry', () => {
      const cache = new LRUCache();
      const newestKey = 'newestKey';
      const newestValue = 'newestValue';

      cache.set('1', 'value1');
      cache.set('2', 'value2');
      cache.set(newestKey, newestValue);

      const { key, value } = cache.newest || {};

      expect(key).toBe(newestKey);
      expect(value).toBe(newestValue);
    });

    it('should return the same newest entry', () => {
      const cache = new LRUCache();
      const newestKey = '3';
      const newestValue = {
        foo: 'bar',
        baz: {
          bax: 'bay'
        }
      };

      cache.set('1', 'value2');
      cache.set('2', 'value3');
      cache.set(newestKey, newestValue);

      const { key, value } = cache.newest || {};

      expect(key).toBe(newestKey);
      expect(value).toBe(newestValue);
    });

    it('should return cloned newest entry', () => {
      const cache = new LRUCache({ clone: true });
      const newestKey = '3';
      const newestValue = {
        foo: 'bar',
        baz: {
          bax: 'bay'
        }
      };

      cache.set('1', 'value2');
      cache.set('2', 'value3');
      cache.set(newestKey, newestValue);

      const { key, value } = cache.newest || {};

      expect(key).toBe(newestKey);
      expect(value).not.toBe(newestValue);
      expect(value).toEqual(newestValue);
    });
  });

  describe('oldest', () => {
    it('should return null for empty cache', () => {
      const cache = new LRUCache();

      expect(cache.oldest).toBeNull();
    });

    it('should return the oldest entry', () => {
      const cache = new LRUCache();
      const oldestKey = 'oldestKey';
      const oldestValue = 'oldestValue';

      cache.set(oldestKey, oldestValue);
      cache.set('2', 'value2');
      cache.set('3', 'value3');

      const { key, value } = cache.oldest || {};

      expect(key).toBe(oldestKey);
      expect(value).toBe(oldestValue);
    });

    it('should return the same oldest entry', () => {
      const cache = new LRUCache();
      const oldestKey = 'oldestKey';
      const oldestValue = {
        foo: 'bar',
        baz: {
          bax: 'bay'
        }
      };

      cache.set(oldestKey, oldestValue);
      cache.set('2', 'value2');
      cache.set('3', 'value3');

      const { key, value } = cache.oldest || {};

      expect(key).toBe(oldestKey);
      expect(value).toBe(oldestValue);
    });

    it('should return cloned oldest entry', () => {
      const cache = new LRUCache({ clone: true });
      const oldestKey = 'oldestKey';
      const oldestValue = {
        foo: 'bar',
        baz: {
          bax: 'bay'
        }
      };

      cache.set(oldestKey, oldestValue);
      cache.set('2', 'value2');
      cache.set('3', 'value3');

      const { key, value } = cache.oldest || {};

      expect(key).toBe(oldestKey);
      expect(value).not.toBe(oldestValue);
      expect(value).toEqual(oldestValue);
    });
  });

  describe('maxSize', () => {
    it('should default to 25', () => {
      const cache = new LRUCache();

      expect(cache.maxSize).toBe(25);
    });

    it.each([1, 5, 100, 34])('should be set to the passed in value', maxSize => {
      const cache = new LRUCache({ maxSize });

      expect(cache.maxSize).toBe(maxSize);
    });

    it.each([0, -1, -0.01, NaN, -1000])('should throw due to passing in invalid maxSize', maxSize => {
      expect(() => new LRUCache({ maxSize })).toThrow();
    });

    it.each([1, 5, 100, 34])('should be set to the new value', maxSize => {
      const cache = new LRUCache();

      cache.maxSize = maxSize;

      expect(cache.maxSize).toBe(maxSize);
    });

    it.each([0, -1, -0.01, NaN, -1000])('should throw due to attempting to set to invalid value', maxSize => {
      const cache = new LRUCache();

      expect(() => (cache.maxSize = maxSize)).toThrow();
    });

    it('should purge the least recently used entries to match new maxSize', () => {
      const initialMaxSize = 20;
      const finalMaxSize = 5;
      const cache = new LRUCache({ maxSize: initialMaxSize });

      const entries: LRUCacheEntry<string, number>[] = [];

      for (let i = 0; i < initialMaxSize; i++) {
        const key = `${i}`;
        const value = i;
        cache.set(key, value);
        // Insert it at start as new lru cache entries will be at start
        entries.unshift({ key, value });
      }

      expect(cache.maxSize).toBe(initialMaxSize);
      expect(cache.size).toBe(initialMaxSize);
      expect(() => validateCacheInternals(cache)).not.toThrow();

      cache.maxSize = finalMaxSize;

      // Ensure cache still has most recent entries
      for (let i = 0; i < finalMaxSize; i++) {
        const { key, value } = entries[i];

        const hasKey = cache.has(key);
        const cacheValue = cache.get(key);

        expect(hasKey).toBe(true);
        expect(cacheValue).toBe(value);
      }

      // Ensure cache does not have oldest entries
      for (let i = finalMaxSize; i < entries.length; i++) {
        const { key } = entries[i];

        const hasKey = cache.has(key);
        const cacheValue = cache.get(key);

        expect(hasKey).toBe(false);
        expect(cacheValue).toBeNull();
      }

      expect(cache.maxSize).toBe(finalMaxSize);
      expect(cache.size).toBe(finalMaxSize);
      expect(() => validateCacheInternals(cache)).not.toThrow();
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

  describe('set', () => {
    it('should add an entry to the cache', () => {
      const cache = new LRUCache();
      const key = 'test-key';
      const value = 'test-value';

      const cacheHasKeyPre = cache.has(key);
      const cachedValuePre = cache.get(key);

      expect(cacheHasKeyPre).toBe(false);
      expect(cachedValuePre).toBeNull();
      expect(cache.size).toBe(0);
      expect(() => validateCacheInternals(cache)).not.toThrow();

      cache.set(key, value);

      const cacheHasKey = cache.has(key);
      const cachedValue = cache.get(key);

      expect(cacheHasKey).toBe(true);
      expect(cachedValue).toBe(value);
      expect(cache.size).toBe(1);
      expect(() => validateCacheInternals(cache)).not.toThrow();
    });

    it('should add a cloned entry to the cache', () => {
      const cache = new LRUCache({ clone: true });
      const key = 'test-key';
      const value = {
        foo: 'bar',
        baz: {
          bax: 'bay'
        }
      };

      const cacheHasKeyPre = cache.has(key);
      const cachedValuePre = cache.get(key);

      expect(cacheHasKeyPre).toBe(false);
      expect(cachedValuePre).toBeNull();
      expect(cache.size).toBe(0);
      expect(() => validateCacheInternals(cache)).not.toThrow();

      cache.set(key, value);

      const cacheHasKey = cache.has(key);
      const cachedValue = cache.get(key);

      expect(cacheHasKey).toBe(true);
      expect(cachedValue).not.toBe(value);
      expect(cachedValue).toEqual(value);
      expect(cache.size).toBe(1);
      expect(() => validateCacheInternals(cache)).not.toThrow();
    });

    it('should return the cache instance', () => {
      const cache = new LRUCache();

      const result = cache.set('key', 'value');

      expect(result).toBe(cache);
    });

    it('should override values of same key', () => {
      const cache = new LRUCache();
      const key = 'test-key';
      const value1 = 'value1';
      const value2 = 'value2';

      cache.set(key, value1);

      const result1 = cache.get(key);

      expect(result1).toBe(value1);
      expect(cache.size).toBe(1);
      expect(() => validateCacheInternals(cache)).not.toThrow();

      cache.set(key, value2);

      const result2 = cache.get(key);

      expect(result2).toBe(value2);
      expect(cache.size).toBe(1);
      expect(() => validateCacheInternals(cache)).not.toThrow();
    });

    it('should evict the least recently accessed entry', () => {
      const cache = new LRUCache({ maxSize: 2 });
      const lastAccessedKey = 'lastAccessedKey';
      const lastAccessedValue = 'lastAccessedValue';

      cache.set('key1', 'value1');
      cache.set(lastAccessedKey, lastAccessedValue);

      expect(cache.size).toBe(2);
      expect(() => validateCacheInternals(cache)).not.toThrow();

      // At this point, lastAccessedKey is the most recently accessed.
      // Access the other to make lastAccessedKey last accessed
      cache.get('key1');

      // Adding a new value will now evict lastAccessedKey from cache
      cache.set('key2', 'value2');

      const result = cache.get(lastAccessedKey);

      expect(result).toBeNull();
      expect(cache.size).toBe(2);
      expect(() => validateCacheInternals(cache)).not.toThrow();
    });

    it('should call the cache onEntryEvicted function', () => {
      const onEntryEvicted = jest.fn();

      const cache = new LRUCache({ maxSize: 2, onEntryEvicted });
      const lastAccessedKey = 'lastAccessedKey';
      const lastAccessedValue = 'lastAccessedValue';

      cache.set('key1', 'value1');
      cache.set(lastAccessedKey, lastAccessedValue);

      // At this point, lastAccessedKey is the most recently accessed.
      // Access the other to make lastAccessedKey last accessed
      cache.get('key1');

      // Adding a new value will now evict lastAccessedKey from cache
      cache.set('key2', 'value2');

      expect(onEntryEvicted).toBeCalledTimes(1);
      expect(onEntryEvicted).toBeCalledWith({ key: lastAccessedKey, value: lastAccessedValue, isExpired: false });
    });

    it('should call the node onEntryEvicted function and not cache function', () => {
      const cacheOnEntryEvicted = jest.fn();
      const entryOnEntryEvicted = jest.fn();

      const cache = new LRUCache({ maxSize: 2, onEntryEvicted: cacheOnEntryEvicted });
      const lastAccessedKey = 'lastAccessedKey';
      const lastAccessedValue = 'lastAccessedValue';

      cache.set('key1', 'value1');
      cache.set(lastAccessedKey, lastAccessedValue, { onEntryEvicted: entryOnEntryEvicted });

      // At this point, lastAccessedKey is the most recently accessed.
      // Access the other to make lastAccessedKey last accessed
      cache.get('key1');

      // Adding a new value will now evict lastAccessedKey from cache
      cache.set('key2', 'value2');

      expect(cacheOnEntryEvicted).not.toBeCalled();
      expect(entryOnEntryEvicted).toBeCalledTimes(1);
      expect(entryOnEntryEvicted).toBeCalledWith({ key: lastAccessedKey, value: lastAccessedValue, isExpired: false });
    });

    it('should call the cache onEntryMarkedAsMostRecentlyUsed function many times', () => {
      const onEntryMarkedAsMostRecentlyUsed = jest.fn();

      const cache = new LRUCache({ maxSize: 2, onEntryMarkedAsMostRecentlyUsed });
      const lastAccessedKey = 'lastAccessedKey';
      const lastAccessedValue = 'lastAccessedValue';

      cache.set('key1', 'value1');

      expect(onEntryMarkedAsMostRecentlyUsed).toHaveBeenLastCalledWith({ key: 'key1', value: 'value1' });

      cache.set(lastAccessedKey, lastAccessedValue);

      expect(onEntryMarkedAsMostRecentlyUsed).toHaveBeenLastCalledWith({
        key: lastAccessedKey,
        value: lastAccessedValue
      });

      // At this point, lastAccessedKey is the most recently accessed.
      // Access the other to make lastAccessedKey last accessed

      cache.get('key1');

      expect(onEntryMarkedAsMostRecentlyUsed).toHaveBeenLastCalledWith({ key: 'key1', value: 'value1' });

      // Adding a new value will now evict lastAccessedKey from cache

      cache.set('key2', 'value2');

      expect(onEntryMarkedAsMostRecentlyUsed).toHaveBeenLastCalledWith({ key: 'key2', value: 'value2' });
      expect(onEntryMarkedAsMostRecentlyUsed).toBeCalledTimes(4);
    });

    it('should call the node onEntryMarkedAsMostRecentlyUsed function and not cache function when entry function is set', () => {
      const cacheOnEntryMarkedAsMostRecentlyUsed = jest.fn();
      const entryOnEntryMarkedAsMostRecentlyUsed = jest.fn();

      const cache = new LRUCache({ maxSize: 2, onEntryMarkedAsMostRecentlyUsed: cacheOnEntryMarkedAsMostRecentlyUsed });

      cache.set('key1', 'value1');

      expect(cacheOnEntryMarkedAsMostRecentlyUsed).toHaveBeenCalledTimes(1);
      expect(entryOnEntryMarkedAsMostRecentlyUsed).toHaveBeenCalledTimes(0);
      expect(cacheOnEntryMarkedAsMostRecentlyUsed).toHaveBeenLastCalledWith({ key: 'key1', value: 'value1' });

      cache.set('key2', 'value2', { onEntryMarkedAsMostRecentlyUsed: entryOnEntryMarkedAsMostRecentlyUsed });

      expect(cacheOnEntryMarkedAsMostRecentlyUsed).toHaveBeenCalledTimes(1);
      expect(entryOnEntryMarkedAsMostRecentlyUsed).toHaveBeenCalledTimes(1);
      expect(entryOnEntryMarkedAsMostRecentlyUsed).toHaveBeenLastCalledWith({ key: 'key2', value: 'value2' });

      cache.get('key1');

      expect(cacheOnEntryMarkedAsMostRecentlyUsed).toHaveBeenCalledTimes(2);
      expect(entryOnEntryMarkedAsMostRecentlyUsed).toHaveBeenCalledTimes(1);
      expect(cacheOnEntryMarkedAsMostRecentlyUsed).toHaveBeenLastCalledWith({ key: 'key1', value: 'value1' });

      cache.get('key2');

      expect(cacheOnEntryMarkedAsMostRecentlyUsed).toHaveBeenCalledTimes(2);
      expect(entryOnEntryMarkedAsMostRecentlyUsed).toHaveBeenCalledTimes(2);
      expect(entryOnEntryMarkedAsMostRecentlyUsed).toHaveBeenLastCalledWith({ key: 'key2', value: 'value2' });
    });

    it('should not evict the least recently accessed entry when setting a key that is already in cache', () => {
      const cache = new LRUCache({ maxSize: 2 });
      const key1 = 'key1';
      const key2 = 'key2';
      const value1 = 'value1';
      const value2 = 'value2';
      const value3 = 'value3';

      cache.set(key1, value1);
      cache.set(key2, value2);

      expect(cache.size).toBe(2);
      expect(() => validateCacheInternals(cache)).not.toThrow();

      cache.set(key2, value3);

      const key1Result = cache.get(key1);
      const key2Result = cache.get(key2);

      expect(key1Result).toBe(value1);
      expect(key2Result).toBe(value3);
      expect(cache.size).toBe(2);
      expect(() => validateCacheInternals(cache)).not.toThrow();
    });

    it.each([10, null])('should set the cache exp time for node exp time', cacheExpTime => {
      const cache = new LRUCache({ entryExpirationTimeInMS: cacheExpTime });

      cache.set('key', 'value');

      const node = (cache as any).head;

      expect(node.entryExpirationTimeInMS).toBe(cacheExpTime);
    });

    it.each([
      { cacheExpTime: 10, entryExpTime: null },
      { cacheExpTime: null, entryExpTime: 123 },
      { cacheExpTime: 10, entryExpTime: 123 },
      { cacheExpTime: null, entryExpTime: null }
    ])('should override the cache level exp time with the passed in time', ({ entryExpTime, cacheExpTime }) => {
      const cache = new LRUCache({ entryExpirationTimeInMS: cacheExpTime });

      cache.set('key', 'value', { entryExpirationTimeInMS: entryExpTime });

      const node = (cache as any).head;

      expect(node.entryExpirationTimeInMS).toBe(entryExpTime);
    });

    it.each([{ foo: 'bar' }, NaN, null, false, true, 3.14, 42, -100, Infinity, undefined, 'key'])(
      'should allow any type for key',
      key => {
        const cache = new LRUCache<any, any>();
        const value = 'someValue';

        cache.set(key, value);

        expect(cache.has(key)).toBe(true);
        expect(cache.get(key)).toEqual(value);
        expect(cache.size).toBe(1);
        expect(() => validateCacheInternals(cache)).not.toThrow();
      }
    );

    it('should exercise the cache', () => {
      const cache = new LRUCache({ maxSize: 50 });
      const keys: string[] = [];

      const randomNumber = (min: number, max: number): number => Math.floor(Math.random() * (max - min) + min);

      // Fill cache while accessing cache
      for (let i = 0; i < cache.maxSize; i++) {
        cache.set(`${i}`, i);
        keys.push(`${i}`);
        const result = cache.get(keys[randomNumber(0, keys.length)]);
        expect(result).not.toBeNull();
        expect(() => validateCacheInternals(cache)).not.toThrow();
      }

      // Randomly exercise the cache
      for (let i = 0; i < 100; i++) {
        const rand = randomNumber(0, 10);

        if (rand % 2 == 0) {
          cache.get(keys[randomNumber(0, keys.length)]);
        } else {
          const secondRandom = randomNumber(0, 10);
          const key = secondRandom % 2 === 0 ? `newKey${i}` : keys[randomNumber(0, keys.length)];
          cache.set(key, i);
        }

        expect(() => validateCacheInternals(cache)).not.toThrow();
      }

      expect(cache.size).toBe(cache.maxSize);
      expect(() => validateCacheInternals(cache)).not.toThrow();
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

    it('should return a reference for a given key for reference types', () => {
      const cache = new LRUCache();
      const key = 'test-key';
      const value = {
        foo: 'bar',
        bax: {
          baz: 10
        }
      };

      cache.set(key, value);

      const result = cache.get(key);

      expect(result).toBe(value);

      value.foo = 'foobar';

      expect(result.foo).toEqual('foobar');
    });

    it('should return a clone for a given key', () => {
      const cache = new LRUCache({ clone: true });
      const key = 'test-key';
      const value = {
        foo: 'bar',
        bax: {
          baz: 10
        }
      };

      cache.set(key, value);

      const result = cache.get(key);

      expect(result).not.toBe(value);

      value.foo = 'foobar';

      expect(result.foo).toEqual('bar');
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

    it('should use reference of object for key', () => {
      const cache = new LRUCache<any, any>();
      const key = {
        foo: 'bar'
      };
      const value = 'someValue';

      cache.set(key, value);

      const item = cache.get(key);

      expect(item).toEqual(value);

      const keyClone = { ...key };

      const itemWithCloneKey = cache.get(keyClone);

      expect(itemWithCloneKey).toBeNull();

      const value2 = 'someOtherValue';

      cache.set(keyClone, value2);

      const item2 = cache.get(key);
      const item3 = cache.get(keyClone);

      expect(item2).toEqual(value);
      expect(item3).toEqual(value2);
    });
  });

  describe('peek', () => {
    it('should return null for key not found in cache', () => {
      const cache = new LRUCache();

      const result = cache.peek('test');

      expect(result).toBeNull();
    });

    it('should return null for expired item', () => {
      const cache = new LRUCache({ entryExpirationTimeInMS: 10000 });
      const key = 'test-key';

      cache.set(key, 'value');

      // force expiration
      (cache as any).head.created = 0;

      const result = cache.peek(key);

      expect(result).toBeNull();
    });

    it('should purge expired item', () => {
      const cache = new LRUCache({ entryExpirationTimeInMS: 10000 });
      const key = 'test-key';

      cache.set(key, 'value');

      // force expiration
      (cache as any).head.created = 0;

      cache.peek(key);

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

      const result = cache.peek(key);

      expect(result).toEqual(value);
    });

    it('should not make the most recently accessed item the head of list', () => {
      const cache = new LRUCache();
      const key = 'test-key';
      const value = 'test-value';

      cache.set(key, value);
      cache.set('test2', 'test2Value');
      cache.set('test3', 'test3');

      cache.peek(key);

      const { key: nodeKey, value: nodeValue } = (cache as any).head;

      expect(nodeKey).toBe('test3');
      expect(nodeValue).toBe('test3');
    });
  });

  describe('delete', () => {
    it('should return true for deleting an entry in the cache', () => {
      const cache = new LRUCache();
      const key = 'test-key';

      cache.set(key, 'value');

      expect(cache.size).toBe(1);
      expect(() => validateCacheInternals(cache)).not.toThrow();

      const result = cache.delete(key);

      expect(result).toBe(true);
      expect(cache.size).toBe(0);
      expect(() => validateCacheInternals(cache)).not.toThrow();
    });

    it('should return false for key not found in cache', () => {
      const cache = new LRUCache();
      const key = 'test-key';

      cache.set('not the key', 'value');

      expect(cache.size).toBe(1);
      expect(() => validateCacheInternals(cache)).not.toThrow();

      const result = cache.delete(key);

      expect(result).toBe(false);
      expect(cache.size).toBe(1);
      expect(() => validateCacheInternals(cache)).not.toThrow();
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

    it('should pass value as first argument, key as second argument, and index as third argument', () => {
      const cache = new LRUCache();

      const entries: LRUCacheEntry<string, number>[] = [];

      for (let i = 0; i < cache.maxSize; i++) {
        const key = `${i}`;
        const value = i;
        cache.set(key, value);
        // Insert it at start as new lru cache entries will be at start
        entries.unshift({ key, value });
      }

      let i = 0;

      cache.forEach((value, key, index) => {
        const entry = entries[index];
        expect(value).toBe(entry.value);
        expect(key).toBe(entry.key);
        expect(index).toBe(i);
        i++;
      });
    });

    it('should remove and not iterate over expired entry', () => {
      const cache = new LRUCache({ entryExpirationTimeInMS: 10000 });

      cache.set('1', 1);
      cache.set('2', 2);
      cache.set('3', 3);

      // force expiration
      (cache as any).head.created = 0;

      let i = 0;

      cache.forEach((value, key) => {
        i++;
        expect(value).not.toBe(3);
        expect(key).not.toBe('3');
      });

      expect(i).toBe(2);
    });

    it('should iterate over unique entries based on key', () => {
      const cache = new LRUCache();
      const key = 'key';
      const lastSetValue = 3;

      cache.set(key, 1);
      cache.set(key, 2);
      cache.set(key, lastSetValue);

      let i = 0;

      cache.forEach((value, key) => {
        i++;
        expect(value).toBe(lastSetValue);
        expect(key).toBe(key);
      });

      expect(i).toBe(1);
      expect(() => validateCacheInternals(cache)).not.toThrow();
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

    it('should iterate over entries in order from newest to oldest', () => {
      const cache = new LRUCache();

      const entries: LRUCacheEntry<string, number>[] = [];

      for (let i = 0; i < cache.maxSize; i++) {
        const key = `${i}`;
        const value = i;
        cache.set(key, value);
        // Insert it at start as new lru cache entries will be at start
        entries.unshift({ key, value });
      }

      let i = 0;

      for (const { key, value } of cache) {
        const { key: expectedKey, value: expectedValue } = entries[i];
        expect(key).toBe(expectedKey);
        expect(value).toBe(expectedValue);
        i++;
      }
    });

    it('should remove and not iterate over expired entry', () => {
      const cache = new LRUCache({ entryExpirationTimeInMS: 10000 });

      cache.set('1', 1);
      cache.set('2', 2);
      cache.set('3', 3);

      // force expiration
      (cache as any).head.created = 0;

      let i = 0;

      for (const { key, value } of cache) {
        expect(key).not.toBe('3');
        expect(value).not.toBe(3);
        i++;
      }

      expect(i).toBe(2);
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

    it('should iterate over keys in order from newest to oldest', () => {
      const cache = new LRUCache();

      const entries: LRUCacheEntry<string, number>[] = [];

      for (let i = 0; i < cache.maxSize; i++) {
        const key = `${i}`;
        const value = i;
        cache.set(key, value);
        // Insert it at start as new lru cache entries will be at start
        entries.unshift({ key, value });
      }

      let i = 0;

      for (const key of cache.keys()) {
        const { key: expectedKey } = entries[i];
        expect(key).toBe(expectedKey);
        i++;
      }
    });

    it('should remove and not iterate over expired entry', () => {
      const cache = new LRUCache({ entryExpirationTimeInMS: 10000 });

      cache.set('1', 1);
      cache.set('2', 2);
      cache.set('3', 3);

      // force expiration
      (cache as any).head.created = 0;

      let i = 0;

      for (const key of cache.keys()) {
        expect(key).not.toBe('3');
        i++;
      }

      expect(i).toBe(2);
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

    it('should iterate over entries in order from newest to oldest', () => {
      const cache = new LRUCache();

      const entries: LRUCacheEntry<string, number>[] = [];

      for (let i = 0; i < cache.maxSize; i++) {
        const key = `${i}`;
        const value = i;
        cache.set(key, value);
        // Insert it at start as new lru cache entries will be at start
        entries.unshift({ key, value });
      }

      let i = 0;

      for (const { key, value } of cache.entries()) {
        const { key: expectedKey, value: expectedValue } = entries[i];
        expect(key).toBe(expectedKey);
        expect(value).toBe(expectedValue);
        i++;
      }
    });

    it('should remove and not iterate over expired entry', () => {
      const cache = new LRUCache({ entryExpirationTimeInMS: 10000 });

      cache.set('1', 1);
      cache.set('2', 2);
      cache.set('3', 3);

      // force expiration
      (cache as any).head.created = 0;

      let i = 0;

      for (const { key, value } of cache.entries()) {
        expect(key).not.toBe('3');
        expect(value).not.toBe(3);
        i++;
      }

      expect(i).toBe(2);
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

    it('should iterate over values in order from newest to oldest', () => {
      const cache = new LRUCache();

      const entries: LRUCacheEntry<string, number>[] = [];

      for (let i = 0; i < cache.maxSize; i++) {
        const key = `${i}`;
        const value = i;
        cache.set(key, value);
        // Insert it at start as new lru cache entries will be at start
        entries.unshift({ key, value });
      }

      let i = 0;

      for (const value of cache.values()) {
        const { value: expectedValue } = entries[i];
        expect(value).toBe(expectedValue);
        i++;
      }
    });

    it('should remove and not iterate over expired entry', () => {
      const cache = new LRUCache({ entryExpirationTimeInMS: 10000 });

      cache.set('1', 1);
      cache.set('2', 2);
      cache.set('3', 3);

      // force expiration
      (cache as any).head.created = 0;

      let i = 0;

      for (const value of cache.values()) {
        expect(value).not.toBe(3);
        i++;
      }

      expect(i).toBe(2);
    });
  });
});
