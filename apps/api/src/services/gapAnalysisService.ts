import { v4 as uuid } from 'uuid';
import { query, queryOne, execute } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { analyzeSkillGap } from '@talentcircuit/ai';
import type { GapAnalysisResult } from '@talentcircuit/shared-types';

export class GapAnalysisService {
  /**
   * Get cached gap analysis or trigger a new Claude analysis.
   * Cached for 7 days (skill_gap_analyses.expires_at).
   */
  async getOrCreateGapAnalysis(
    userId: string,
    postingId: string,
    companyId: string
  ): Promise<GapAnalysisResult & { cached: boolean; analysisId: string }> {
    // Check cache
    const cached = await queryOne<any>(
      `SELECT * FROM skill_gap_analyses
       WHERE user_id = $1 AND posting_id = $2 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, postingId]
    );

    if (cached) {
      return {
        ...this.parseResult(cached),
        cached: true,
        analysisId: cached.id,
      };
    }

    // Check rate limit: max 10 per day per user
    const today = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM skill_gap_analyses
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    );
    if (parseInt(today?.count ?? '0') >= 10) {
      throw new AppError(429, 'Daily gap analysis limit reached (10/day)');
    }

    // Fetch employee profile
    const employeeSkills = await query<any>(
      `SELECT es.proficiency_level, es.validation_status, s.name, s.category
       FROM employee_skills es
       JOIN skills s ON es.skill_id = s.id
       WHERE es.user_id = $1`,
      [userId]
    );

    const user = await queryOne<any>(
      `SELECT u.*, r.title as current_role
       FROM users u
       LEFT JOIN roles r ON u.current_role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    // Fetch job posting requirements
    const posting = await queryOne<any>(
      `SELECT jp.*, r.title as role_title
       FROM job_postings jp
       JOIN roles r ON jp.role_id = r.id
       WHERE jp.id = $1 AND jp.company_id = $2`,
      [postingId, companyId]
    );
    if (!posting) throw new AppError(404, 'Job posting not found');

    const roleSkills = await query<any>(
      `SELECT rsr.*, s.name, s.category
       FROM role_skill_requirements rsr
       JOIN skills s ON rsr.skill_id = s.id
       WHERE rsr.role_id = $1`,
      [posting.role_id]
    );

    // Call Claude API
    const result = await analyzeSkillGap(
      {
        currentRole: user?.current_role ?? 'Unknown',
        skills: employeeSkills.map((es: any) => ({
          name: es.name,
          category: es.category,
          proficiency: es.proficiency_level,
          validated: es.validation_status === 'manager_validated',
        })),
      },
      {
        title: posting.role_title,
        skills: roleSkills.map((rs: any) => ({
          name: rs.name,
          category: rs.category,
          requiredProficiency: rs.required_proficiency,
          isRequired: rs.is_required,
        })),
      }
    );

    // Cache the result
    const analysis = await queryOne<any>(
      `INSERT INTO skill_gap_analyses (id, user_id, posting_id, match_score, strengths, gaps, learning_plan, assessment, generated_by, expires_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, NOW() + INTERVAL '7 days')
       ON CONFLICT (user_id, posting_id) DO UPDATE SET expires_at = NOW() + INTERVAL '7 days'
       RETURNING *`,
      [
        uuid(),
        userId,
        postingId,
        result.matchScore,
        JSON.stringify(result.strengths),
        JSON.stringify(result.gaps),
        JSON.stringify(result.learningPlan),
        result.assessment,
        process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      ]
    );

    return {
      ...result,
      cached: false,
      analysisId: analysis.id,
    };
  }

  private parseResult(row: any): GapAnalysisResult {
    return {
      matchScore: row.match_score,
      breakdown: [],
      strengths: typeof row.strengths === 'string' ? JSON.parse(row.strengths) : (row.strengths ?? []),
      gaps: typeof row.gaps === 'string' ? JSON.parse(row.gaps) : (row.gaps ?? []),
      learningPlan: typeof row.learning_plan === 'string' ? JSON.parse(row.learning_plan) : (row.learning_plan ?? []),
      assessment: row.assessment ?? '',
    };
  }
}
