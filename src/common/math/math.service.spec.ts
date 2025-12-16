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

    it('should return 0 for empty vectors', () => {
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

    it('should be symmetric: sim(a,b) === sim(b,a)', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];

      const ab = service.cosineSimilarity(a, b);
      const ba = service.cosineSimilarity(b, a);

      expect(ab).toBeCloseTo(ba!);
    });

    it('should be scale-invariant', () => {
      const a = [1, 2, 3];
      const b = [2, 4, 6];

      const scaledA = a.map(v => v * 10);
      const scaledB = b.map(v => v * 0.1);

      const original = service.cosineSimilarity(a, b);
      const scaled = service.cosineSimilarity(scaledA, scaledB);

      expect(scaled).toBeCloseTo(original!);
    });

    it('should always return value between -1 and 1', () => {
      const randomVec = () =>
        Array.from({ length: 20 }, () => Math.random() * 20 - 10);

      for (let i = 0; i < 50; i++) {
        const sim = service.cosineSimilarity(
          randomVec(),
          randomVec(),
        );

        expect(sim).toBeGreaterThanOrEqual(-1);
        expect(sim).toBeLessThanOrEqual(1);
      }
    });

    it('should be stable under small noise', () => {
      const base = [1, 1, 1, 1, 1];
      const noisy = base.map(v => v + Math.random() * 0.001);

      const sim = service.cosineSimilarity(base, noisy);

      expect(sim).toBeGreaterThan(0.999);
    });

    it('Scenario: "Genre Salad" vs "Purist"', () => {
      const userVec = [1, 0, 0, 0, 0];

      const movieVec = [1, 1, 1, 1, 1];

      const similarity = service.cosineSimilarity(userVec, movieVec);

      expect(similarity).toBeCloseTo(0.447, 3);
    });
  });

  describe('magnitude', () => {
    it('should return 0 for zero vector', () => {
      expect(service.magnitude([0, 0, 0])).toBe(0);
    });

    it('should ignore sign of values', () => {
      expect(service.magnitude([3, -4])).toBe(5);
    });

    it('should scale linearly', () => {
      const vec = [3, 4];
      const scaled = vec.map(v => v * 3);

      expect(service.magnitude(scaled)).toBeCloseTo(
        service.magnitude(vec) * 3,
      );
    });

    it('should handle very large numbers', () => {
      const vec = [1e150, 1e150];
      expect(service.magnitude(vec)).toBeGreaterThan(0);
    });
  });

  describe('dotProduct', () => {
    it('should return correct dot product', () => {
      expect(service.dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
    });

    it('should be commutative', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];

      expect(service.dotProduct(a, b)).toBe(
        service.dotProduct(b, a),
      );
    });

    it('should return 0 for orthogonal vectors', () => {
      expect(service.dotProduct([1, 0], [0, 1])).toBe(0);
    });

    it('should throw if vector lengths differ', () => {
      expect(() =>
        service.dotProduct([1, 2], [1]),
      ).toThrow();
    });

    it('should work with negative values', () => {
      expect(service.dotProduct([1, -2], [-3, 4])).toBe(-11);
    });
  });
});
