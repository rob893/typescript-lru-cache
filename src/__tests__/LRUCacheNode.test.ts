import { LRUCacheNode } from '../LRUCacheNode';

describe('LRUCacheNode', () => {
  describe('constructor', () => {
    it.each([
      { key: 'key1', value: 'value1' },
      { key: 'key2', value: 'value2' },
      { key: 'key3', value: 'value3' }
    ])('should create a cache node with the passed in keys and values', ({ key, value }) => {
      const node = new LRUCacheNode(key, value);

      expect(node.key).toEqual(key);
      expect(node.value).toEqual(value);
      expect(typeof node.created).toBe('number');
      expect(node.entryExpirationTimeInMS).toBeNull();
      expect(node.next).toBeNull();
      expect(node.prev).toBeNull();
    });

    it('should set null for entryExpirationTimeInMS', () => {
      const node1 = new LRUCacheNode('key', 'value');

      expect(node1.entryExpirationTimeInMS).toBeNull();

      const node2 = new LRUCacheNode('key', 'value', { entryExpirationTimeInMS: null });

      expect(node2.entryExpirationTimeInMS).toBeNull();
    });

    it.each([0.1, 1, 1099387, Number.MAX_VALUE])('should set the passed number for entryExpirationTimeInMS', num => {
      const node = new LRUCacheNode('key', 'value', { entryExpirationTimeInMS: num });

      expect(node.entryExpirationTimeInMS).toBe(num);
    });

    it.each([0, -1, -1099387, NaN])('should throw for invalid entryExpirationTimeInMS', num => {
      expect(() => new LRUCacheNode('key', 'value', { entryExpirationTimeInMS: num })).toThrow();
    });

    it('should set the passed in next node as next', () => {
      const next = new LRUCacheNode('nextKey', 'nextValue');
      const node = new LRUCacheNode('key', 'value', { next });

      expect(node.next).toBe(next);
    });

    it('should set the passed in prev node as prev', () => {
      const prev = new LRUCacheNode('prevKey', 'prevValue');
      const node = new LRUCacheNode('key', 'value', { prev });

      expect(node.prev).toBe(prev);
    });
  });

  describe('isExpired', () => {
    it('should not be expired due to null entryExpirationTimeInMS (no expiration)', () => {
      const node = new LRUCacheNode('key', 'value');

      expect(node.isExpired).toBe(false);

      // Force created to be less than now
      (node as any).created = 0;

      expect(node.isExpired).toBe(false);
      expect(node.entryExpirationTimeInMS).toBeNull();
    });

    it('should not be expired', () => {
      const node = new LRUCacheNode('key', 'value', { entryExpirationTimeInMS: 10000 });

      expect(node.isExpired).toBe(false);
      expect(node.entryExpirationTimeInMS).not.toBeNull();
    });

    it('should be expired', () => {
      const node = new LRUCacheNode('key', 'value', { entryExpirationTimeInMS: 10000 });

      // Force created to be less than now
      (node as any).created = 0;

      expect(node.isExpired).toBe(true);
      expect(node.entryExpirationTimeInMS).not.toBeNull();
    });
  });

  describe('invokeOnEvicted', () => {
    it('should call the passed in onEvicted function', () => {
      const onEntryEvicted = jest.fn();

      const key = 'key';
      const value = 'value';

      const node = new LRUCacheNode(key, value, { onEntryEvicted });

      node.invokeOnEvicted();

      expect(onEntryEvicted).toBeCalledTimes(1);
      expect(onEntryEvicted).toBeCalledWith({ key, value, isExpired: false });
    });
  });

  describe('invokeOnEntryMarkedAsMostRecentlyUsed', () => {
    it('should call the passed in onEvicted function', () => {
      const onEntryMarkedAsMostRecentlyUsed = jest.fn();

      const key = 'key';
      const value = 'value';

      const node = new LRUCacheNode(key, value, { onEntryMarkedAsMostRecentlyUsed });

      node.invokeOnEntryMarkedAsMostRecentlyUsed();

      expect(onEntryMarkedAsMostRecentlyUsed).toBeCalledTimes(1);
      expect(onEntryMarkedAsMostRecentlyUsed).toBeCalledWith({ key, value });
    });
  });
});
