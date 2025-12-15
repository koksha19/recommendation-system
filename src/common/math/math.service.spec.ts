import { Test, TestingModule } from '@nestjs/testing';
import { MathService } from './math.service';

describe('MathService', () => {
  let service: MathService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MathService],
    }).compile();

    service = module.get<MathService>(MathService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vecA = [1, 2, 3, 4, 5];
      const vecB = [1, 2, 3, 4, 5];
      expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors (no similarity)', () => {
      const vecA = [1, 0];
      const vecB = [0, 1];
      expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(0);
    });

    it('should return -1 for opposite vectors', () => {
      const vecA = [1, 1];
      const vecB = [-1, -1];
      expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(-1);
    });

    it('should return 0 if one vector is zero-magnitude', () => {
      const vecA = [0, 0, 0];
      const vecB = [1, 2, 3];
      expect(service.cosineSimilarity(vecA, vecB)).toBe(0);
    });

    it('should return 0 if both vectors are zero-magnitude', () => {
      const vecA = [0, 0];
      const vecB = [0, 0];
      expect(service.cosineSimilarity(vecA, vecB)).toBe(0);
    });

    it('should throw error if vector lengths do not match', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2];
      expect(() => service.cosineSimilarity(vecA, vecB)).toThrow(
        'Vectors must have the same length',
      );
    });

    it('should handle empty vectors by throwing error', () => {
      expect(service.cosineSimilarity([], [])).toBe(0);
    });

    it('should handle negative numbers mixed with positives', () => {
      const res = service.cosineSimilarity([1, -2], [1, 2]);
      expect(res).toBeCloseTo(-0.6);
    });

    it('should handle large sparse vectors', () => {
      const vecA = new Array(100).fill(0);
      vecA[0] = 1;
      const vecB = new Array(100).fill(0);
      vecB[99] = 1;
      expect(service.cosineSimilarity(vecA, vecB)).toBe(0);
    });

    it('should calculate correctly for large vectors', () => {
      const vecA = new Array(1000).fill(1);
      const vecB = new Array(1000).fill(0.5);
      expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(1);
    });

    it('should handle floating point precision', () => {
      const vecA = [0.1 + 0.2, 0.3];
      const vecB = [0.3, 0.3];
      expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(1);
    });

    const testCases = [
      { a: [1, 2], b: [2, 4], expected: 1 }, // Collinear
      { a: [1, 0], b: [1, 1], expected: 0.7071 }, // 45 degrees
      { a: [5, 0], b: [0, 5], expected: 0 }, // 90 degrees
      { a: [1, 2, 3], b: [-1, -2, -3], expected: -1 }, // 180 degrees
    ];

    testCases.forEach(({ a, b, expected }, index) => {
      it(`Scenario #${index}: should calculate similarity for ${JSON.stringify(a)} and ${JSON.stringify(b)}`, () => {
        expect(service.cosineSimilarity(a, b)).toBeCloseTo(expected, 4);
      });
    });

    it('Scenario: "Genre Salad" vs "Purist"', () => {
      const userVec = [1, 0, 0, 0, 0];

      const movieVec = [1, 1, 1, 1, 1];

      const similarity = service.cosineSimilarity(userVec, movieVec);

      expect(similarity).toBeCloseTo(0.447, 3);
    });
  });
});
