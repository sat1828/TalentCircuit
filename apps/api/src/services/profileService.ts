import { v4 as uuid } from 'uuid';
import { query, queryOne, execute } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { cacheDel } from '../config/redis';
import { NotificationService } from './notificationService';
import { NotificationType } from '@talentcircuit/shared-types';
import type { EmployeeSkill } from '@talentcircuit/shared-types';

interface SkillRow {
  id: string;
  name: string;
  category: string;
  parent_skill_id: string | null;
}

interface EmployeeSkillRow {
  id: string;
  user_id: string;
  skill_id: string;
  skill_name: string;
  skill_category: string;
  proficiency_level: number;
  validation_status: string;
  validated_by: string | null;
  validated_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export class ProfileService {
  async getProfile(userId: string) {
    const user = await queryOne<any>(
      `SELECT u.*, r.title as current_role_title, t.name as team_name,
              m.full_name as manager_name
       FROM users u
       LEFT JOIN roles r ON u.current_role_id = r.id
       LEFT JOIN teams t ON u.team_id = t.id
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.id = $1`,
      [userId]
    );
    if (!user) throw new AppError(404, 'User not found');

    return {
      id: user.id,
      companyId: user.company_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      currentRoleId: user.current_role_id,
      currentRoleTitle: user.current_role_title || null,
      teamId: user.team_id,
      teamName: user.team_name || null,
      managerId: user.manager_id,
      managerName: user.manager_name || null,
      isActive: user.is_active,
      profileCompleteness: user.profile_completeness,
      aspirationShort: user.aspiration_short || null,
      aspirationLong: user.aspiration_long || null,
      avatarUrl: user.avatar_url || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async updateProfile(userId: string, data: {
    fullName?: string;
    aspirationShort?: string | null;
    aspirationLong?: string | null;
    avatarUrl?: string | null;
  }) {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.fullName !== undefined) {
      sets.push(`full_name = $${idx++}`);
      params.push(data.fullName);
    }
    if (data.aspirationShort !== undefined) {
      sets.push(`aspiration_short = $${idx++}`);
      params.push(data.aspirationShort);
    }
    if (data.aspirationLong !== undefined) {
      sets.push(`aspiration_long = $${idx++}`);
      params.push(data.aspirationLong);
    }
    if (data.avatarUrl !== undefined) {
      sets.push(`avatar_url = $${idx++}`);
      params.push(data.avatarUrl);
    }

    if (sets.length === 0) throw new AppError(400, 'No fields to update');

    sets.push(`updated_at = NOW()`);
    params.push(userId);

    const user = await queryOne<any>(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING *`,
      params
    );
    if (!user) throw new AppError(404, 'User not found');

    return this.getProfile(userId);
  }

  async getSkills(userId: string): Promise<EmployeeSkill[]> {
    const rows = await query<EmployeeSkillRow>(
      `SELECT es.*, s.name as skill_name, s.category as skill_category
       FROM employee_skills es
       JOIN skills s ON es.skill_id = s.id
       WHERE es.user_id = $1
       ORDER BY s.category, s.name`,
      [userId]
    );

    return rows.map(this.mapEmployeeSkill);
  }

  async addSkill(userId: string, skillName: string, proficiencyLevel: number) {
    // Find or create skill
    let skill = await queryOne<SkillRow>(
      'SELECT * FROM skills WHERE LOWER(name) = LOWER($1)',
      [skillName]
    );

    if (!skill) {
      // Auto-create the skill if it doesn't exist
      skill = await queryOne<SkillRow>(
        `INSERT INTO skills (id, name, category)
         VALUES ($1, $2, 'technical')
         RETURNING *`,
        [uuid(), skillName]
      );
      if (!skill) throw new AppError(500, 'Failed to create skill');
    }

    // Check if already exists
    const existing = await queryOne<EmployeeSkillRow>(
      'SELECT id FROM employee_skills WHERE user_id = $1 AND skill_id = $2',
      [userId, skill.id]
    );
    if (existing) throw new AppError(409, 'Skill already added to profile');

    const es = await queryOne<EmployeeSkillRow>(
      `INSERT INTO employee_skills (id, user_id, skill_id, proficiency_level, source)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuid(), userId, skill.id, proficiencyLevel, 'self']
    );
    if (!es) throw new AppError(500, 'Failed to add skill');

    // Invalidate cache
    await cacheDel(`profile:vector:${userId}`);
    await this.recomputeProfileCompleteness(userId);

    return this.mapEmployeeSkill({ ...es, skill_name: skill.name, skill_category: skill.category });
  }

  async updateSkill(userId: string, skillId: string, proficiencyLevel: number) {
    const es = await queryOne<EmployeeSkillRow>(
      `UPDATE employee_skills
       SET proficiency_level = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [proficiencyLevel, skillId, userId]
    );
    if (!es) throw new AppError(404, 'Skill not found on profile');

    // Reset validation status on proficiency change
    await execute(
      `UPDATE employee_skills SET validation_status = 'self_reported', validated_by = NULL, validated_at = NULL
       WHERE id = $1`,
      [skillId]
    );

    await cacheDel(`profile:vector:${userId}`);
    return this.getSkills(userId);
  }

  async removeSkill(userId: string, skillId: string) {
    const deleted = await execute(
      'DELETE FROM employee_skills WHERE id = $1 AND user_id = $2',
      [skillId, userId]
    );
    if (deleted === 0) throw new AppError(404, 'Skill not found on profile');

    await cacheDel(`profile:vector:${userId}`);
    await this.recomputeProfileCompleteness(userId);
  }

  async requestSkillValidation(userId: string, employeeSkillId: string) {
    // Manager validates an employee's skill
    const es = await queryOne<any>(
      `SELECT es.*, s.name as skill_name FROM employee_skills es
       JOIN users u ON es.user_id = u.id
       JOIN skills s ON es.skill_id = s.id
       WHERE es.id = $1 AND u.manager_id = $2`,
      [employeeSkillId, userId]
    );
    if (!es) throw new AppError(404, 'Skill not found or not your report');

    const updated = await queryOne<EmployeeSkillRow>(
      `UPDATE employee_skills
       SET validation_status = 'manager_validated', validated_by = $1, validated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [userId, employeeSkillId]
    );

    // Notify the employee that their skill has been validated
    const notificationService = new NotificationService();
    await notificationService.notify(
      es.user_id,
      NotificationType.ValidationRequest,
      'Skill validated',
      `Your "${es.skill_name}" skill has been validated by your manager.`,
      { employeeSkillId, skillName: es.skill_name }
    );

    await cacheDel(`profile:vector:${es.user_id}`);
    return updated ? this.mapEmployeeSkill(updated) : null;
  }

  private async recomputeProfileCompleteness(userId: string) {
    const skills = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM employee_skills WHERE user_id = $1',
      [userId]
    );
    const count = skills[0]?.count ?? 0;

    // Completeness formula: 10% for having any skills, + 15% per skill up to 6 skills
    const completeness = Math.min(10 + count * 15, 100);
    await execute(
      'UPDATE users SET profile_completeness = $1, updated_at = NOW() WHERE id = $2',
      [completeness, userId]
    );
  }

  private mapEmployeeSkill(row: any): EmployeeSkill {
    return {
      id: row.id,
      userId: row.user_id,
      skillId: row.skill_id,
      skillName: row.skill_name || row.skillName,
      skillCategory: row.skill_category || row.skillCategory,
      proficiencyLevel: row.proficiency_level ?? row.proficiencyLevel,
      validationStatus: row.validation_status || row.validationStatus,
      validatedBy: row.validated_by || row.validatedBy || null,
      validatedAt: row.validated_at || row.validatedAt || null,
      source: row.source || null,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
    };
  }
}
