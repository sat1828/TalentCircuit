import { query, queryOne } from '../config/database';
import { cacheGet, cacheSet, CACHE_TTL } from '../config/redis';

export class MetricsService {
  async getDashboardMetrics(companyId: string) {
    const cacheKey = `metrics:dashboard:${companyId}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) return cached;

    const totalEmployees = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
      [companyId]
    );

    const openRoles = await queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM job_postings WHERE company_id = $1 AND status = 'open'",
      [companyId]
    );

    const totalApplicants = await queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT a.applicant_id) as count
       FROM applications a
       JOIN job_postings jp ON a.posting_id = jp.id
       WHERE jp.company_id = $1 AND a.status >= 'applied'`,
      [companyId]
    );

    const avgMatchScore = await queryOne<{ avg: string }>(
      `SELECT AVG(match_score) as avg
       FROM applications a
       JOIN job_postings jp ON a.posting_id = jp.id
       WHERE jp.company_id = $1 AND match_score IS NOT NULL`,
      [companyId]
    );

    // Department breakdown
    const departments = await query<any>(
      `SELECT r.department,
              COUNT(DISTINCT u.id) as employees,
              COUNT(DISTINCT jp.id) FILTER (WHERE jp.status = 'open') as open_roles,
              COUNT(DISTINCT a.id) as applications
       FROM roles r
       LEFT JOIN users u ON u.current_role_id = r.id AND u.is_active = true
       LEFT JOIN job_postings jp ON jp.role_id = r.id
       LEFT JOIN applications a ON a.posting_id = jp.id
       WHERE r.company_id = $1 AND r.department IS NOT NULL
       GROUP BY r.department`,
      [companyId]
    );

    // Monthly trend (last 6 months)
    const trend = await query<any>(
      `SELECT to_char(created_at, 'YYYY-MM') as month,
              COUNT(*) FILTER (WHERE status = 'offered') as internal_fills,
              0 as external_fills
       FROM applications a
       JOIN job_postings jp ON a.posting_id = jp.id
       WHERE jp.company_id = $1
         AND created_at > NOW() - INTERVAL '6 months'
       GROUP BY month
       ORDER BY month`,
      [companyId]
    );

    const metrics = {
      totalEmployees: parseInt(totalEmployees?.count ?? '0'),
      openRoles: parseInt(openRoles?.count ?? '0'),
      internalApplicants: parseInt(totalApplicants?.count ?? '0'),
      averageMatchScore: avgMatchScore ? Math.round(parseFloat(avgMatchScore.avg) * 100) / 100 : 0,
      mobilityRate: 0, // Computed as: internal fills / total fills over period
      departmentBreakdown: departments.map((d: any) => ({
        department: d.department,
        employees: parseInt(d.employees ?? '0'),
        openRoles: parseInt(d.open_roles ?? '0'),
        applications: parseInt(d.applications ?? '0'),
      })),
      monthlyTrend: trend.map((t: any) => ({
        month: t.month,
        internalFills: parseInt(t.internal_fills ?? '0'),
        externalFills: parseInt(t.external_fills ?? '0'),
        mobilityRate: 0,
      })),
    };

    await cacheSet(cacheKey, metrics, CACHE_TTL.METRICS);
    return metrics;
  }

  async getDepartmentMetrics(companyId: string, department: string) {
    return query<any>(
      `SELECT u.id, u.full_name, r.title as role, es.skill_count
       FROM users u
       JOIN roles r ON u.current_role_id = r.id
       LEFT JOIN (SELECT user_id, COUNT(*) as skill_count FROM employee_skills GROUP BY user_id) es ON es.user_id = u.id
       WHERE u.company_id = $1 AND r.department = $2 AND u.is_active = true
       ORDER BY u.full_name`,
      [companyId, department]
    );
  }

  async getSkillDistribution(companyId: string) {
    return query<any>(
      `SELECT s.name, s.category, COUNT(es.id) as employee_count,
              AVG(es.proficiency_level) as avg_proficiency
       FROM skills s
       JOIN employee_skills es ON es.skill_id = s.id
       JOIN users u ON es.user_id = u.id
       WHERE u.company_id = $1 AND u.is_active = true
       GROUP BY s.id, s.name, s.category
       ORDER BY employee_count DESC
       LIMIT 50`,
      [companyId]
    );
  }
}
