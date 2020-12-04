# typescript-lru-cache

This is a simple LRU cache implementation written in Typescript.

## Installation:

```typescript
npm i typescript-lru-cache
```

## Usage:

```typescript
import { LRUCache } from 'typescript-lru-cache';

// Create a cache. Optional options object can be passed in.
const cache = new LRUCache();

// Set a value in the cache with a key
cache.set('testKey', 'testValue');

// value will be 'testValue'
const value = cache.get('testKey');
console.log(value);
```
