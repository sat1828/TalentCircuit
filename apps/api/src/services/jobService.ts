import { v4 as uuid } from 'uuid';
import { query, queryOne, execute } from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface JobPostingRow {
  id: string;
  company_id: string;
  role_id: string;
  role_title: string;
  posted_by: string;
  posted_by_name: string;
  title: string;
  description: string | null;
  status: string;
  posting_type: string;
  is_anonymous_apply: boolean;
  application_deadline: string | null;
  created_at: string;
  updated_at: string;
  match_score?: number;
  applicant_count?: number;
  required_skill_count?: number;
}

export class JobService {
  async listJobs(userId: string, companyId: string, filters?: {
    status?: string;
    type?: string;
    department?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['jp.company_id = $1'];
    const params: any[] = [companyId];
    let idx = 2;

    if (filters?.status) {
      conditions.push(`jp.status = $${idx++}`);
      params.push(filters.status);
    } else {
      conditions.push(`jp.status = 'open'`);
    }

    if (filters?.type) {
      conditions.push(`jp.posting_type = $${idx++}`);
      params.push(filters.type);
    }

    if (filters?.department) {
      conditions.push(`r.department = $${idx++}`);
      params.push(filters.department);
    }

    const where = conditions.join(' AND ');

    const rows = await query<any>(
      `SELECT jp.*, r.title as role_title, u.full_name as posted_by_name,
              COALESCE(a.applicant_count, 0) as applicant_count,
              COALESCE(rs.required_skill_count, 0) as required_skill_count
       FROM job_postings jp
       JOIN roles r ON jp.role_id = r.id
       JOIN users u ON jp.posted_by = u.id
       LEFT JOIN (SELECT posting_id, COUNT(*) as applicant_count FROM applications GROUP BY posting_id) a ON a.posting_id = jp.id
       LEFT JOIN (SELECT role_id, COUNT(*) as required_skill_count FROM role_skill_requirements GROUP BY role_id) rs ON rs.role_id = jp.role_id
       WHERE ${where}
       ORDER BY jp.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const total = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM job_postings jp
       JOIN roles r ON jp.role_id = r.id
       WHERE ${where}`,
      params.slice(0, params.length - 2)
    );

    return {
      data: rows.map(this.mapJobPosting),
      total: parseInt(total?.count ?? '0'),
      page,
      limit,
      totalPages: Math.ceil(parseInt(total?.count ?? '0') / limit),
    };
  }

  async getJob(jobId: string, companyId: string) {
    const row = await queryOne<any>(
      `SELECT jp.*, r.title as role_title, r.level, r.department, r.description as role_description, u.full_name as posted_by_name,
              COALESCE(a.applicant_count, 0) as applicant_count
       FROM job_postings jp
       JOIN roles r ON jp.role_id = r.id
       JOIN users u ON jp.posted_by = u.id
       LEFT JOIN (SELECT posting_id, COUNT(*) as applicant_count FROM applications GROUP BY posting_id) a ON a.posting_id = jp.id
       WHERE jp.id = $1 AND jp.company_id = $2`,
      [jobId, companyId]
    );
    if (!row) throw new AppError(404, 'Job posting not found');

    const skills = await query<any>(
      `SELECT rsr.*, s.name as skill_name, s.category as skill_category
       FROM role_skill_requirements rsr
       JOIN skills s ON rsr.skill_id = s.id
       WHERE rsr.role_id = $1`,
      [row.role_id]
    );

    return {
      ...this.mapJobPosting(row),
      roleLevel: row.level,
      department: row.department,
      roleDescription: row.role_description,
      skills: skills.map((s: any) => ({
        skillId: s.skill_id,
        skillName: s.skill_name,
        skillCategory: s.skill_category,
        requiredProficiency: s.required_proficiency,
        isRequired: s.is_required,
      })),
    };
  }

  async createPosting(companyId: string, postedBy: string, data: {
    roleId: string;
    title: string;
    description?: string;
    postingType: string;
    isAnonymousApply?: boolean;
    applicationDeadline?: string;
  }) {
    const posting = await queryOne<any>(
      `INSERT INTO job_postings (id, company_id, role_id, posted_by, title, description, posting_type, is_anonymous_apply, application_deadline, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open')
       RETURNING *`,
      [
        uuid(), companyId, data.roleId, postedBy, data.title,
        data.description || null, data.postingType,
        data.isAnonymousApply ?? true, data.applicationDeadline || null,
      ]
    );
    if (!posting) throw new AppError(500, 'Failed to create posting');

    return this.mapJobPosting(posting);
  }

  async expressInterest(userId: string, postingId: string, companyId: string) {
    const posting = await queryOne<any>(
      'SELECT * FROM job_postings WHERE id = $1 AND company_id = $2',
      [postingId, companyId]
    );
    if (!posting) throw new AppError(404, 'Job posting not found');

    await execute(
      `INSERT INTO job_interests (id, posting_id, user_id) VALUES ($1, $2, $3)
       ON CONFLICT (posting_id, user_id) DO NOTHING`,
      [uuid(), postingId, userId]
    );
  }

  async apply(userId: string, postingId: string, companyId: string) {
    const posting = await queryOne<any>(
      'SELECT * FROM job_postings WHERE id = $1 AND company_id = $2 AND status = $3',
      [postingId, companyId, 'open']
    );
    if (!posting) throw new AppError(404, 'Job posting not found or closed');

    const existing = await queryOne<any>(
      'SELECT id, status FROM applications WHERE posting_id = $1 AND applicant_id = $2',
      [postingId, userId]
    );
    if (existing) throw new AppError(409, 'Already applied to this role');

    const application = await queryOne<any>(
      `INSERT INTO applications (id, posting_id, applicant_id, status)
       VALUES ($1, $2, $3, 'applied')
       RETURNING *`,
      [uuid(), postingId, userId]
    );

    return application;
  }

  async getApplications(userId: string, role: string, companyId: string) {
    // Employees see their own; managers see applications to their postings
    if (role === 'employee') {
      const rows = await query<any>(
        `SELECT a.*, jp.title as posting_title, r.title as role_title
         FROM applications a
         JOIN job_postings jp ON a.posting_id = jp.id
         JOIN roles r ON jp.role_id = r.id
         WHERE a.applicant_id = $1
         ORDER BY a.created_at DESC`,
        [userId]
      );
      return rows;
    }

    const rows = await query<any>(
      `SELECT a.*, u.full_name as applicant_name, jp.title as posting_title, r.title as role_title
       FROM applications a
       JOIN job_postings jp ON a.posting_id = jp.id
       JOIN roles r ON jp.role_id = r.id
       JOIN users u ON a.applicant_id = u.id
       WHERE jp.posted_by = $1 AND jp.company_id = $2 AND a.status NOT IN ('interested', 'withdrawn')
       ORDER BY a.created_at DESC`,
      [userId, companyId]
    );
    return rows;
  }

  async updateApplicationStatus(
    postingId: string,
    applicantId: string,
    status: string,
    managerId: string
  ) {
    // Only the posting's manager can update
    const posting = await queryOne<any>(
      'SELECT * FROM job_postings WHERE id = $1 AND posted_by = $2',
      [postingId, managerId]
    );
    if (!posting) throw new AppError(403, 'Not authorized to update this application');

    const application = await queryOne<any>(
      `UPDATE applications SET status = $1, updated_at = NOW()
       WHERE posting_id = $2 AND applicant_id = $3
       RETURNING *`,
      [status, postingId, applicantId]
    );
    if (!application) throw new AppError(404, 'Application not found');

    // If moving to interview stage, notify current manager
    if (status === 'interview' && !application.current_manager_notified) {
      const applicant = await queryOne<any>(
        'SELECT manager_id FROM users WHERE id = $1',
        [applicantId]
      );
      if (applicant?.manager_id) {
        const applicantUser = await queryOne<{ full_name: string }>(
          'SELECT full_name FROM users WHERE id = $1',
          [applicantId]
        );
        await execute(
          `INSERT INTO notifications (id, user_id, type, title, body)
           VALUES ($1, $2, 'application_update', $3, $4)`,
          [
            uuid(),
            applicant.manager_id,
            'Team member moving to interview stage',
            `${applicantUser?.full_name ?? 'An employee'} has been selected for an interview for ${posting.title}.`,
          ]
        );
        await execute(
          `UPDATE applications SET current_manager_notified = true
           WHERE posting_id = $1 AND applicant_id = $2`,
          [postingId, applicantId]
        );
      }
    }

    return application;
  }

  async getInterestCount(postingId: string, companyId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM job_interests ji
       JOIN job_postings jp ON ji.posting_id = jp.id
       WHERE ji.posting_id = $1 AND jp.company_id = $2`,
      [postingId, companyId]
    );
    return parseInt(result?.count ?? '0');
  }

  private mapJobPosting(row: any) {
    return {
      id: row.id,
      companyId: row.company_id,
      roleId: row.role_id,
      roleTitle: row.role_title,
      postedBy: row.posted_by,
      postedByName: row.posted_by_name,
      title: row.title,
      description: row.description,
      status: row.status,
      postingType: row.posting_type,
      isAnonymousApply: row.is_anonymous_apply,
      applicationDeadline: row.application_deadline,
      matchScore: row.match_score,
      applicantCount: parseInt(row.applicant_count ?? '0'),
      requiredSkillCount: parseInt(row.required_skill_count ?? '0'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
