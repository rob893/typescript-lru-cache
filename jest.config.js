'use strict';

const ignored = ['<rootDir>/dist/', '<rootDir>/src/__benchmarks__/'];

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ignored,
  coveragePathIgnorePatterns: ignored,
  modulePathIgnorePatterns: ignored,
  watchPathIgnorePatterns: ignored
};
