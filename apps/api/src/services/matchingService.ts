import { query, queryOne, execute } from '../config/database';
import { redis, cacheGet, cacheSet, cacheDel, CACHE_TTL } from '../config/redis';
import OpenAI from 'openai';
import { env } from '../config/env';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

interface SkillEmbedding {
  id: string;
  name: string;
  embedding: number[];
}

interface UserMatch {
  id: string;
  full_name: string;
  current_role: string;
  team_name: string;
  match_score: number;
}

interface JobMatch {
  id: string;
  title: string;
  role_title: string;
  match_score: number;
}

export class MatchingService {
  /**
   * Generate embedding for a text string using OpenAI.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: env.EMBEDDING_MODEL,
        input: text,
      });
      return response.data[0]?.embedding ?? [];
    } catch (err) {
      console.error('[Matching] Embedding generation failed:', err);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  /**
   * Compute and cache an employee's aggregate profile vector.
   * Weighted average of skill embeddings × proficiency × validation multiplier.
   */
  async computeProfileVector(userId: string): Promise<number[]> {
    const cacheKey = `profile:vector:${userId}`;
    const cached = await cacheGet<number[]>(cacheKey);
    if (cached) return cached;

    const skills = await query<any>(
      `SELECT es.proficiency_level, es.validation_status, s.name, COALESCE(s.embedding, '{}') as embedding
       FROM employee_skills es
       JOIN skills s ON es.skill_id = s.id
       WHERE es.user_id = $1`,
      [userId]
    );

    if (skills.length === 0) {
      const zero = new Array(1536).fill(0);
      await cacheSet(cacheKey, zero, CACHE_TTL.PROFILE_VECTOR);
      return zero;
    }

    let totalWeight = 0;
    const sumVector = new Array(1536).fill(0);

    for (const skill of skills) {
      const emb = this.parseEmbedding(skill.embedding);
      if (emb.length !== 1536) continue;

      const validationMultiplier = skill.validation_status === 'manager_validated' ? 1.3 : 1.0;
      const weight = skill.proficiency_level * validationMultiplier;
      totalWeight += weight;

      for (let i = 0; i < 1536; i++) {
        sumVector[i]! += emb[i]! * weight;
      }
    }

    const profileVector = totalWeight > 0
      ? sumVector.map((v) => v / totalWeight)
      : new Array(1536).fill(0);

    // Normalize the vector
    const magnitude = Math.sqrt(profileVector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < 1536; i++) {
        profileVector[i] = profileVector[i]! / magnitude;
      }
    }

    await cacheSet(cacheKey, profileVector, CACHE_TTL.PROFILE_VECTOR);

    // Also store in DB for SQL-level queries
    await execute(
      `UPDATE users SET profile_vector = $1::vector, updated_at = NOW() WHERE id = $2`,
      [`[${profileVector.join(',')}]`, userId]
    );

    return profileVector;
  }

  /**
   * Compute a role's requirement vector.
   */
  async computeRoleVector(roleId: string): Promise<number[]> {
    const requirements = await query<any>(
      `SELECT rsr.required_proficiency, rsr.is_required, s.name, COALESCE(s.embedding, '{}') as embedding
       FROM role_skill_requirements rsr
       JOIN skills s ON rsr.skill_id = s.id
       WHERE rsr.role_id = $1`,
      [roleId]
    );

    if (requirements.length === 0) return new Array(1536).fill(0);

    let totalWeight = 0;
    const sumVector = new Array(1536).fill(0);

    for (const req of requirements) {
      const emb = this.parseEmbedding(req.embedding);
      if (emb.length !== 1536) continue;

      const weight = req.required_proficiency * (req.is_required ? 1.5 : 1.0);
      totalWeight += weight;

      for (let i = 0; i < 1536; i++) {
        sumVector[i]! += emb[i]! * weight;
      }
    }

    const roleVector = totalWeight > 0
      ? sumVector.map((v) => v / totalWeight)
      : new Array(1536).fill(0);

    const magnitude = Math.sqrt(roleVector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < 1536; i++) {
        roleVector[i] = roleVector[i]! / magnitude;
      }
    }

    return roleVector;
  }

  /**
   * Find the top matching jobs for a given employee using pgvector cosine similarity.
   */
  async findTopJobsForEmployee(
    userId: string,
    companyId: string,
    limit = 10
  ): Promise<JobMatch[]> {
    const cacheKey = `match:jobs:${userId}`;
    const cached = await cacheGet<JobMatch[]>(cacheKey);
    if (cached) return cached;

    // Compute or retrieve profile vector
    await this.computeProfileVector(userId);

    // Use pgvector cosine similarity via SQL
    const rows = await query<any>(
      `SELECT jp.id, jp.title, r.title as role_title,
              1 - (u.profile_vector <=> COALESCE(r.embedding, '[0]'::vector)) as match_score
       FROM job_postings jp
       JOIN roles r ON jp.role_id = r.id
       JOIN users u ON u.id = $1
       WHERE jp.company_id = $2
         AND jp.status = 'open'
         AND u.profile_vector IS NOT NULL
         AND r.embedding IS NOT NULL
       ORDER BY match_score DESC
       LIMIT $3`,
      [userId, companyId, limit]
    );

    const matches = rows
      .filter((r: any) => r.match_score > 0)
      .map((r: any) => ({
        id: r.id,
        title: r.title,
        role_title: r.role_title,
        match_score: Math.round(parseFloat(r.match_score) * 100),
      }));

    await cacheSet(cacheKey, matches, CACHE_TTL.MATCH_SCORES);
    return matches;
  }

  /**
   * Find hidden talent: employees who match a job posting but haven't applied.
   * Returns anonymized results for manager view (names hidden unless applied).
   */
  async findHiddenTalent(
    postingId: string,
    companyId: string,
    managerId: string,
    limit = 20
  ): Promise<any[]> {
    const posting = await queryOne<any>(
      'SELECT * FROM job_postings WHERE id = $1 AND company_id = $2',
      [postingId, companyId]
    );
    if (!posting) return [];

    const rows = await query<any>(
      `SELECT u.id, u.full_name, r.title as current_role, t.name as team_name,
              1 - (u.profile_vector <=> (SELECT COALESCE(r2.embedding, '[0]'::vector) FROM job_postings jp2 JOIN roles r2 ON jp2.role_id = r2.id WHERE jp2.id = $1)) as match_score,
              EXISTS (SELECT 1 FROM applications a WHERE a.applicant_id = u.id AND a.posting_id = $1) as has_applied
       FROM users u
       JOIN roles r ON u.current_role_id = r.id
       LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.company_id = $2
         AND u.is_active = true
         AND u.id != $3
         AND u.profile_vector IS NOT NULL
       ORDER BY match_score DESC
       LIMIT $4`,
      [postingId, companyId, managerId, limit]
    );

    return rows
      .filter((r: any) => r.match_score > 0.5)
      .map((r: any) => {
        const isAnonymous = !r.has_applied;
        return {
          userId: isAnonymous ? null : r.id,
          fullName: r.has_applied ? r.full_name : 'Anonymous',
          currentRole: r.current_role,
          team: r.team_name,
          matchScore: Math.round(parseFloat(r.match_score) * 100),
          hasApplied: !!r.has_applied,
          isAnonymous,
        };
      });
  }

  /**
   * Compute career path data for an employee.
   * Uses pre-computed role hierarchy and skill adjacency.
   */
  async computeCareerPath(userId: string, companyId: string) {
    const user = await queryOne<any>(
      'SELECT current_role_id FROM users WHERE id = $1',
      [userId]
    );
    if (!user?.current_role_id) return null;

    // Get all roles in the company
    const allRoles = await query<any>(
      `SELECT r.id, r.title, r.level, r.department, COALESCE(r.embedding, '[0]'::vector) as embedding
       FROM roles r
       WHERE r.company_id = $1 AND r.id != $2`,
      [companyId, user.current_role_id]
    );
    if (allRoles.length === 0) return null;

    // Get user's profile vector
    const profileVector = await this.computeProfileVector(userId);
    const profileVecStr = `[${profileVector.join(',')}]`;

    // Batch compute all match scores in a single query
    const roleEmbeddings = allRoles.map((r: any) => r.embedding);
    const scoreExprs = allRoles.map((_: any, i: number) =>
      `1 - ($1::vector <=> $${i + 2}::vector)`
    );

    const scoresResult = await query<any>(
      `SELECT unnest(ARRAY[${scoreExprs.join(',')}]) as score`,
      [profileVecStr, ...roleEmbeddings]
    );

    // Pre-fetch all role requirements in one query
    const roleIds = allRoles.map((r: any) => r.id);
    const allRequirements = await query<any>(
      `SELECT rsr.role_id, rsr.required_proficiency, rsr.is_required, s.name as skill_name
       FROM role_skill_requirements rsr
       JOIN skills s ON rsr.skill_id = s.id
       WHERE rsr.role_id = ANY($1::uuid[])`,
      [roleIds]
    );

    // Pre-fetch user skills once
    const userSkills = await query<any>(
      `SELECT es.*, s.name as skill_name
       FROM employee_skills es
       JOIN skills s ON es.skill_id = s.id
       WHERE es.user_id = $1`,
      [userId]
    );

    // Group requirements by role_id
    const reqByRole = new Map<string, any[]>();
    for (const req of allRequirements) {
      const list = reqByRole.get(req.role_id) ?? [];
      list.push(req);
      reqByRole.set(req.role_id, list);
    }

    // Compute gaps in-memory for each role
    const scoredRoles = allRoles.map((role: any, index: number) => {
      const matchScore = scoresResult[index]
        ? Math.round(parseFloat(scoresResult[index].score) * 100)
        : 0;

      const requirements = reqByRole.get(role.id) ?? [];
      const gaps = this.computeSkillGapsInMemory(userSkills, requirements);

      let timeHorizon: '1year' | '2year' | '3year';
      if (matchScore >= 75) timeHorizon = '1year';
      else if (matchScore >= 55) timeHorizon = '2year';
      else timeHorizon = '3year';

      return {
        roleId: role.id,
        title: role.title,
        level: role.level,
        department: role.department,
        matchScore,
        timeHorizon,
        skillGaps: gaps.slice(0, 5),
      };
    });

    const currentRole = await queryOne<any>(
      'SELECT id, title, level FROM roles WHERE id = $1',
      [user.current_role_id]
    );

    return {
      currentRole: currentRole
        ? { id: currentRole.id, title: currentRole.title, level: currentRole.level }
        : null,
      oneYear: scoredRoles.filter((r) => r.timeHorizon === '1year').sort((a, b) => b.matchScore - a.matchScore),
      twoYear: scoredRoles.filter((r) => r.timeHorizon === '2year').sort((a, b) => b.matchScore - a.matchScore),
      threeYear: scoredRoles.filter((r) => r.timeHorizon === '3year').sort((a, b) => b.matchScore - a.matchScore),
    };
  }

  private computeSkillGapsInMemory(userSkills: any[], requirements: any[]) {
    return requirements.map((req: any) => {
      const userSkill = userSkills.find((us: any) => us.skill_name === req.skill_name);
      const current = userSkill?.proficiency_level ?? 0;
      const gap = req.required_proficiency - current;
      return {
        skillName: req.skill_name,
        currentProficiency: current,
        requiredProficiency: req.required_proficiency,
        gap: Math.max(gap, 0),
        isRequired: req.is_required,
      };
    });
  }

  /**
   * Compute specific skill gaps between a user and a role.
   */
  async computeSkillGaps(userId: string, roleId: string) {
    const requirements = await query<any>(
      `SELECT rsr.*, s.name as skill_name
       FROM role_skill_requirements rsr
       JOIN skills s ON rsr.skill_id = s.id
       WHERE rsr.role_id = $1`,
      [roleId]
    );

    const userSkills = await query<any>(
      `SELECT es.*, s.name as skill_name
       FROM employee_skills es
       JOIN skills s ON es.skill_id = s.id
       WHERE es.user_id = $1`,
      [userId]
    );

    return requirements.map((req: any) => {
      const userSkill = userSkills.find((us: any) => us.skill_name === req.skill_name);
      const current = userSkill?.proficiency_level ?? 0;
      const gap = req.required_proficiency - current;
      return {
        skillName: req.skill_name,
        currentProficiency: current,
        requiredProficiency: req.required_proficiency,
        gap: Math.max(gap, 0),
        isRequired: req.is_required,
      };
    });
  }

  /**
   * Seed embeddings for all skills that don't have them yet.
   */
  async seedSkillEmbeddings(): Promise<number> {
    const skills = await query<any>(
      'SELECT id, name, category FROM skills WHERE embedding IS NULL'
    );

    if (skills.length === 0) return 0;

    let count = 0;
    for (const skill of skills) {
      try {
        const embedding = await this.generateEmbedding(
          `${skill.name} - ${skill.category} skill`
        );
        await execute(
          `UPDATE skills SET embedding = $1::vector WHERE id = $2`,
          [`[${embedding.join(',')}]`, skill.id]
        );
        count++;
      } catch (err) {
        console.error(`[Matching] Failed to embed skill ${skill.name}:`, err);
      }
    }

    return count;
  }

  /**
   * Recompute all profile embeddings and role embeddings.
   * Run daily as a background job.
   */
  async recomputeAllEmbeddings(companyId: string): Promise<void> {
    const users = await query<any>(
      'SELECT id FROM users WHERE company_id = $1 AND is_active = true',
      [companyId]
    );

    for (const user of users) {
      try {
        await this.computeProfileVector(user.id);
      } catch (err) {
        console.error(`[Matching] Failed to recompute profile for user ${user.id}:`, err);
      }
    }
  }

  private parseEmbedding(embedding: any): number[] {
    if (!embedding) return [];
    if (Array.isArray(embedding)) return embedding;
    if (typeof embedding === 'string') {
      try {
        return JSON.parse(embedding);
      } catch {
        return [];
      }
    }
    return [];
  }
}
