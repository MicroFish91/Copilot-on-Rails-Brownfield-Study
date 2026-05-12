import '@testing-library/jest-dom/vitest';

// jsdom does not implement URL.createObjectURL; stub for components that
// preview newly-uploaded files via blob URLs.
if (typeof URL.createObjectURL !== 'function') {
  Object.defineProperty(URL, 'createObjectURL', {
    value: () => 'blob:mock',
    writable: true,
  });
}
if (typeof URL.revokeObjectURL !== 'function') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: () => undefined,
    writable: true,
  });
}
