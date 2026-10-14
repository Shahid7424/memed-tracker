/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // Starting an in-memory MongoDB replica set can be slow on the first run.
  testTimeout: 60000,
};
