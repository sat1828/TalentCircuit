import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/env', () => ({
  env: {
    OPENAI_API_KEY: 'sk-test',
    EMBEDDING_MODEL: 'text-embedding-3-small',
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

vi.mock('../config/database', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('../config/redis', () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
  CACHE_TTL: { PROFILE_VECTOR: 3600, MATCH_SCORES: 3600 },
}));

vi.mock('openai', () => {
  const MockOpenAI = vi.fn(() => ({
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  }));
  return { default: MockOpenAI };
});

import { MatchingService } from '../services/matchingService';

describe('MatchingService', () => {
  const service = new MatchingService();

  describe('parseEmbedding', () => {
    it('returns empty array for null input', () => {
      const result = (service as any).parseEmbedding(null);
      expect(result).toEqual([]);
    });

    it('returns array as-is for array input', () => {
      const result = (service as any).parseEmbedding([1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('parses JSON string', () => {
      const result = (service as any).parseEmbedding('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it('returns empty array for invalid string', () => {
      const result = (service as any).parseEmbedding('not-json');
      expect(result).toEqual([]);
    });

    it('returns empty array for unexpected type', () => {
      const result = (service as any).parseEmbedding(42);
      expect(result).toEqual([]);
    });
  });

  describe('computeSkillGapsInMemory', () => {
    it('computes gaps when user lacks some skills', () => {
      const userSkills = [
        { skill_name: 'JavaScript', proficiency_level: 3 },
      ];
      const requirements = [
        { skill_name: 'JavaScript', required_proficiency: 4, is_required: true },
        { skill_name: 'TypeScript', required_proficiency: 3, is_required: true },
      ];
      const gaps = (service as any).computeSkillGapsInMemory(userSkills, requirements);
      expect(gaps).toHaveLength(2);
      expect(gaps[0].gap).toBe(1);
      expect(gaps[1].gap).toBe(3);
    });

    it('returns zero gap when user meets requirements', () => {
      const userSkills = [
        { skill_name: 'JavaScript', proficiency_level: 5 },
      ];
      const requirements = [
        { skill_name: 'JavaScript', required_proficiency: 3, is_required: true },
      ];
      const gaps = (service as any).computeSkillGapsInMemory(userSkills, requirements);
      expect(gaps[0].gap).toBe(0);
    });
  });

  describe('generateEmbedding', () => {
    it('returns embedding array on success', async () => {
      const result = await service.generateEmbedding('test skill');
      expect(result).toHaveLength(1536);
    });

    it('returns zero vector on failure', async () => {
      const mockOpenAI = await import('openai');
      (mockOpenAI.default as any).mock.results[0].value.embeddings.create.mockRejectedValueOnce(new Error('API error'));
      const result = await service.generateEmbedding('test');
      expect(result).toHaveLength(1536);
      expect(result.every((v) => v === 0)).toBe(true);
    });
  });
});
