import { Test, TestingModule } from '@nestjs/testing';
import { MathService } from './math.service';
import * as fc from 'fast-check';

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

  describe('cosineSimilarity (Unit)', () => {
    it('should calculate identical vectors as 1', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2, 3];
      expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(1, 5);
    });

    it('should calculate orthogonal vectors as 0', () => {
      const vecA = [1, 0];
      const vecB = [0, 1];
      expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(0, 5);
    });

    it('should calculate opposite vectors as -1', () => {
      const vecA = [1, 1];
      const vecB = [-1, -1];
      expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(-1, 5);
    });

    it('should return null for zero vectors', () => {
      expect(service.cosineSimilarity([0, 0], [1, 2])).toBeNull();
    });

    it('should throw error for vectors of different length', () => {
      expect(() => service.dotProduct([1], [1, 2])).toThrow();
    });
  });

  describe('cosineSimilarity (Property-based)', () => {
    it('should always return value between -1 and 1', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float(), { minLength: 1, maxLength: 50 }),
          fc.array(fc.float(), { minLength: 1, maxLength: 50 }),
          (a, b) => {
            const bSameSize = b.slice(0, a.length);

            while (bSameSize.length < a.length) {
              bSameSize.push(0);
            }

            const result = service.cosineSimilarity(a, bSameSize);

            if (result) {
              expect(result).toBeGreaterThanOrEqual(-1.00001);
              expect(result).toBeLessThanOrEqual(1.00001);
            }
          },
        ),
      );
    });

    it('should be commutative: sim(A, B) === sim(B, A)', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float(), { minLength: 1, maxLength: 20 }),
          fc.array(fc.float(), { minLength: 1, maxLength: 20 }),
          (a, b) => {
            const len = Math.min(a.length, b.length);
            const vecA = a.slice(0, len);
            const vecB = b.slice(0, len);

            const simAB = service.cosineSimilarity(vecA, vecB);
            const simBA = service.cosineSimilarity(vecB, vecA);

            if (simAB && simBA) {
              expect(simAB).toBeCloseTo(simBA, 5);
            }
          },
        ),
      );
    });
  });
});
