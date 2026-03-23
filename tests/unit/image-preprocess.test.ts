import { describe, test, expect } from 'vitest';
import { resizeImageToVideoDimensions } from '../../src/features/uploads/image-preprocess';

describe('image-preprocess', () => {
  describe('resizeImageToVideoDimensions', () => {
    test('accepts file and target dimensions', async () => {
      const testBuffer = Buffer.from('fake-jpeg-data');
      const file = new File([testBuffer], 'test.jpg', { type: 'image/jpeg' });
      const targetDims = { width: 50, height: 50 };

      const promise = resizeImageToVideoDimensions(file, targetDims);
      
      expect(promise).toBeInstanceOf(Promise);
    });
  });
});
