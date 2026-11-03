// Setup after environment is loaded (where test globals like afterEach are available)

// Cleanup after each test to prevent memory leaks
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
});
