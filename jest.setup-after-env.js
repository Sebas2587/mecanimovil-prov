// Setup after environment is loaded (where test globals like afterEach are available)

// Use fake timers to prevent Jest worker timeout issues
beforeEach(() => {
  jest.useFakeTimers();
});

// Cleanup after each test to prevent memory leaks
afterEach(() => {
  // Run all pending timers before cleanup
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Cleanup after all tests to ensure Jest workers exit cleanly
afterAll(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  // Close any open handles by giving async operations time to complete
  await new Promise(resolve => setImmediate(resolve));
});
