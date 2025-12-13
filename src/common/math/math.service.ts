import { Injectable } from '@nestjs/common';

@Injectable()
export class MathService {
  public cosineSimilarity(vecA: number[], vecB: number[]): number | null {
    const magA = this.magnitude(vecA);
    const magB = this.magnitude(vecB);

    if (magA === 0 || magB === 0) {
      return null;
    }

    const dot = this.dotProduct(vecA, vecB);

    return dot / (magA * magB);
  }

  public magnitude(vec: number[]): number {
    const sumOfSquares = vec.reduce((sum, val) => sum + val * val, 0);

    return Math.sqrt(sumOfSquares);
  }

  public dotProduct(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  }
}
