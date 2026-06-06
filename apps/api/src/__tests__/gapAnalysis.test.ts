import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('../config/env', () => ({
  env: { CORS_ORIGIN: 'http://localhost:5173' },
  isDev: false,
  isProd: false,
}));

vi.mock('@talentcircuit/ai', () => ({
  analyzeSkillGap: vi.fn().mockResolvedValue({
    matchScore: 72,
    strengths: [{ skillName: 'JavaScript', currentProficiency: 4, requiredProficiency: 3, gap: 0 }],
    gaps: [{ skillName: 'TypeScript', currentProficiency: 1, requiredProficiency: 3, gap: 2 }],
    learningPlan: [{ skillName: 'TypeScript', milestone: 'Complete中级 course', timeframe: '3 months', resources: [] }],
    assessment: 'Solid foundation with room to grow in TypeScript.',
  }),
}));

import { GapAnalysisService } from '../services/gapAnalysisService';

describe('GapAnalysisService', () => {
  const service = new GapAnalysisService();
  const userId = 'user-1';
  const postingId = 'posting-1';
  const companyId = 'company-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached analysis when available and not expired', async () => {
    const { queryOne } = await import('../config/database');
    (queryOne as any).mockResolvedValue({
      id: 'cached-id',
      match_score: 85,
      strengths: '[]',
      gaps: '[]',
      learning_plan: '[]',
      assessment: 'Cached assessment',
    });

    const result = await service.getOrCreateGapAnalysis(userId, postingId, companyId);
    expect(result.cached).toBe(true);
    expect(result.analysisId).toBe('cached-id');
  });

  it('throws 429 when rate limit exceeded', async () => {
    const { queryOne, query } = await import('../config/database');
    // First call: cache miss
    (queryOne as any).mockResolvedValueOnce(null);
    // Second call: rate limit check
    (queryOne as any).mockResolvedValueOnce({ count: '10' });
    // query for employee skills, user, posting, roleSkills
    (query as any).mockResolvedValue([]);

    await expect(
      service.getOrCreateGapAnalysis(userId, postingId, companyId)
    ).rejects.toThrow('Daily gap analysis limit reached');
  });

  it('throws 404 when posting not found', async () => {
    const { queryOne, query } = await import('../config/database');
    (queryOne as any).mockResolvedValueOnce(null); // cache miss
    (queryOne as any).mockResolvedValueOnce({ count: '0' }); // rate limit OK
    (query as any).mockResolvedValue([]); // employeeSkills
    (queryOne as any).mockResolvedValueOnce({ id: userId, current_role: 'Engineer' }); // user
    (queryOne as any).mockResolvedValueOnce(null); // posting not found

    await expect(
      service.getOrCreateGapAnalysis(userId, postingId, companyId)
    ).rejects.toThrow('Job posting not found');
  });

  it('generates new analysis when no cache and under rate limit', async () => {
    const { queryOne, query } = await import('../config/database');
    (queryOne as any).mockResolvedValueOnce(null); // cache miss
    (queryOne as any).mockResolvedValueOnce({ count: '2' }); // rate limit OK
    (query as any).mockResolvedValueOnce([]); // employeeSkills
    (queryOne as any).mockResolvedValueOnce({ id: userId, current_role: 'Engineer' }); // user
    (queryOne as any).mockResolvedValueOnce({ id: postingId, role_id: 'role-1', role_title: 'Senior Engineer' }); // posting
    (query as any).mockResolvedValueOnce([]); // roleSkills
    (queryOne as any).mockResolvedValueOnce({
      id: 'new-id',
      match_score: 72,
      strengths: '[]',
      gaps: '[]',
      learning_plan: '[]',
      assessment: 'Solid foundation',
    }); // insert result

    const result = await service.getOrCreateGapAnalysis(userId, postingId, companyId);
    expect(result.cached).toBe(false);
    expect(result.analysisId).toBe('new-id');
    expect(result.matchScore).toBe(72);
  });
});
