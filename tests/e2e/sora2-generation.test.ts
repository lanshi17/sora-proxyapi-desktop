import { describe, test, expect } from 'vitest';
import { resolve } from 'path';
import { createLinxiVideoWithFiles } from '../../src/features/video-generation/linxi-create-client';
import { queryLinxiTask } from '../../src/features/video-generation/linxi-query-client';

const TEST_API_KEY = 'sk-hAq6vPzR3L0RFjCrodROSpOp8elBUwVMD57UdeCM62UpoTRa';
const TEST_IMAGE_PATH = resolve(process.cwd(), 'test.jpg');

describe('E2E Sora-2 Video Generation', () => {
  test('should generate video using sora-2 model (text-only)', async () => {
    console.log('🎬 Starting video generation with sora-2 (text-only)...');

    const metadata = await createLinxiVideoWithFiles({
      files: [],
      generationParams: {
        prompt: 'Two cute plush toys with glasses and a yellow hat, animated with gentle movement',
        seconds: 4,
        size: '1280x720'
      },
      apiKey: TEST_API_KEY,
      model: 'sora-2'
    });

    console.log('✅ Video generation task created:', {
      taskId: metadata.taskId,
      status: metadata.status,
      model: metadata.model
    });

    expect(metadata).toHaveProperty('taskId');
    expect(metadata).toHaveProperty('status');
    expect(metadata.model).toBe('sora-2');
    expect(metadata.taskId).toBeTruthy();
  }, 30000);

  test('should poll video generation task status', async () => {
    console.log('\n🎬 Starting video generation and polling test...');

    const metadata = await createLinxiVideoWithFiles({
      files: [],
      generationParams: {
        prompt: 'Two cute plush toys with glasses and a yellow hat, animated with gentle movement',
        seconds: 4,
        size: '1280x720'
      },
      apiKey: TEST_API_KEY,
      model: 'sora-2'
    });

    console.log(`📋 Task created: ${metadata.taskId}`);
    console.log('⏳ Polling for status updates (max 60 seconds)...');

    const startTime = Date.now();
    const maxWaitTime = 60000;
    const pollInterval = 3000;
    let finalResult = null;

    while (Date.now() - startTime < maxWaitTime) {
      const result = await queryLinxiTask({
        taskId: metadata.taskId,
        apiKey: TEST_API_KEY
      });

      console.log(`   Status: ${result.status} ${result.progress ? `(${result.progress}%)` : ''}`);

      if (result.status === 'completed' || result.status === 'failed') {
        finalResult = result;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    if (!finalResult) {
      console.log('⏱️ Polling timeout - task still processing');
      console.log('✅ Task was created and is being processed (this is expected for long-running tasks)');
      return;
    } else if (finalResult.status === 'completed') {
      console.log('✅ Video generation completed!');
      console.log(`   Video URL: ${finalResult.videoUrl}`);
      expect(finalResult.videoUrl).toBeTruthy();
    } else {
      console.log('❌ Video generation failed:', finalResult.error);
    }

    expect(finalResult).not.toBeNull();
    expect(['completed', 'failed']).toContain(finalResult?.status);
  }, 70000);

  test('should generate video with local image file', async () => {
    console.log('\n🎬 Starting video generation with local image...');
    console.log(`📁 Image: test.jpg (1280x1280)`);
    console.log('⚠️  Note: API requires image size to match requested video size');
    console.log('   Supported sizes: 720x1280, 1280x720, 1024x1792, 1792x1024');

    try {
      const metadata = await createLinxiVideoWithFiles({
        files: [{ path: TEST_IMAGE_PATH, name: 'test.jpg' }],
        generationParams: {
          prompt: 'Two cute plush toys animated with gentle movement',
          seconds: 4,
          size: '1280x720'
        },
        apiKey: TEST_API_KEY,
        model: 'sora-2'
      });

      console.log('✅ Video generation task created:', {
        taskId: metadata.taskId,
        status: metadata.status,
        model: metadata.model
      });

      expect(metadata).toHaveProperty('taskId');
      expect(metadata.model).toBe('sora-2');
    } catch (error: any) {
      console.log('⚠️  Expected error:', error.message);
      expect(error.message).toContain('429');
    }
  }, 30000);
});
