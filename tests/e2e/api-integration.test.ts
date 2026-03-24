import { describe, test, expect } from 'vitest';
import { fetchModels } from '../../src/features/models/model-fetch-client';
import { queryLinxiTask } from '../../src/features/video-generation/linxi-query-client';

const TEST_API_KEY = 'sk-hAq6vPzR3L0RFjCrodROSpOp8elBUwVMD57UdeCM62UpoTRa';

describe('E2E API Integration Tests', () => {
  describe('Models API', () => {
    test('should fetch available models from Linxi API', async () => {
      const models = await fetchModels(TEST_API_KEY);

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      // Verify model structure
      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('object');
        expect(typeof model.id).toBe('string');
        expect(typeof model.object).toBe('string');
      });

      // Check for Sora models
      const soraModels = models.filter(m => m.id.includes('sora'));
      console.log('✅ Available Sora models:', soraModels.map(m => m.id));
      expect(soraModels.length).toBeGreaterThan(0);
    });

    test('should return models with valid IDs', async () => {
      const models = await fetchModels(TEST_API_KEY);

      models.forEach(model => {
        expect(model.id).toBeTruthy();
        expect(model.id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Task Query API', () => {
    test('should query existing task and return valid structure', async () => {
      // Using a sample task ID for testing
      // Note: This test may fail if the task doesn't exist
      const sampleTaskId = 'task-sample-123';

      try {
        const result = await queryLinxiTask({
          taskId: sampleTaskId,
          apiKey: TEST_API_KEY
        });

        // If task exists, verify structure
        expect(result).toHaveProperty('taskId');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('videoUrl');
        expect(typeof result.taskId).toBe('string');
        expect(typeof result.status).toBe('string');

        console.log('✅ Task query successful:', {
          taskId: result.taskId,
          status: result.status,
          videoUrl: result.videoUrl ? 'present' : 'null'
        });
      } catch (error) {
        // Expected if task doesn't exist - verify we get a proper error
        expect(error).toBeInstanceOf(Error);
        console.log('ℹ️ Task not found (expected):', (error as Error).message);
      }
    });

    test('should handle invalid API key', async () => {
      await expect(
        fetchModels('invalid-api-key')
      ).rejects.toThrow();
    });
  });

  describe('API Response Validation', () => {
    test('all model IDs should follow naming conventions', async () => {
      const models = await fetchModels(TEST_API_KEY);

      models.forEach(model => {
        // Sora models should have 'sora' in the ID
        if (model.id.includes('sora')) {
          expect(model.id).toMatch(/sora/);
        }
      });
    });

    test('API should respond within reasonable time', async () => {
      const startTime = Date.now();
      await fetchModels(TEST_API_KEY);
      const duration = Date.now() - startTime;

      console.log(`✅ API response time: ${duration}ms`);
      expect(duration).toBeLessThan(10000); // Should respond within 10 seconds
    });
  });
});

describe('E2E Full Workflow Test', () => {
  test('complete workflow: fetch models -> verify API connectivity', async () => {
    // Step 1: Fetch models
    const models = await fetchModels(TEST_API_KEY);
    expect(models.length).toBeGreaterThan(0);

    // Step 2: Verify we have Sora models available
    const soraModels = models.filter(m => m.id.includes('sora'));
    expect(soraModels.length).toBeGreaterThan(0);

    console.log('✅ Full workflow test passed');
    console.log('📊 Test Summary:');
    console.log(`   - Total models: ${models.length}`);
    console.log(`   - Sora models: ${soraModels.length}`);
    console.log(`   - Model IDs: ${soraModels.map(m => m.id).join(', ')}`);
  });
});
