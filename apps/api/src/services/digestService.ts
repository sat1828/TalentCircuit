import nodemailer from 'nodemailer';
import { query, queryOne, execute } from '../config/database';
import { env } from '../config/env';
import { MatchingService } from './matchingService';
import { generateDigestPersonalization } from '@talentcircuit/ai';
import { v4 as uuid } from 'uuid';

const matchingService = new MatchingService();

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const DIGEST_HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">Your Weekly Talent Digest</h1>
      <p style="color: #666; font-size: 14px;">{{WEEK_OF}}</p>
    </div>
    <div style="background: #eef2ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #4338ca; font-size: 14px; line-height: 1.5;">{{PERSONALIZED_NOTE}}</p>
    </div>
    {{MATCHES_HTML}}
    {{STRETCH_HTML}}
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #999; font-size: 12px;">TalentCircuit — Internal Talent Marketplace</p>
    </div>
  </div>
</body>
</html>`;

export class DigestService {
  /**
   * Generate and send weekly digest for all active employees with complete profiles.
   */
  async generateWeeklyDigests(companyId: string): Promise<number> {
    const employees = await query<any>(
      `SELECT u.id, u.company_id, u.full_name, u.email, u.aspiration_short, r.title as current_role
       FROM users u
       LEFT JOIN roles r ON u.current_role_id = r.id
       WHERE u.company_id = $1
         AND u.is_active = true
         AND u.profile_completeness >= 70`,
      [companyId]
    );

    let sent = 0;
    for (const employee of employees) {
      try {
        await this.sendDigestForEmployee(employee);
        sent++;
      } catch (err) {
        console.error(`[Digest] Failed for ${employee.email}:`, err);
      }
    }

    return sent;
  }

  /**
   * Send digest for a single employee.
   */
  private async sendDigestForEmployee(employee: any) {
    const topMatches = await matchingService.findTopJobsForEmployee(employee.id, employee.company_id);
    const weekOf = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let personalizedNote = 'Here are your top role matches this week based on your skills.';
    let stretchRole = null;

    // Get personalized blurbs from Claude
    if (topMatches.length > 0) {
      const employeeSkills = await query<any>(
        `SELECT s.name, es.proficiency_level
         FROM employee_skills es
         JOIN skills s ON es.skill_id = s.id
         WHERE es.user_id = $1
         ORDER BY es.proficiency_level DESC
         LIMIT 10`,
        [employee.id]
      );

      try {
        const blurbs = await generateDigestPersonalization(
          employee.full_name,
          employee.current_role || 'Employee',
          employeeSkills.map((s: any) => ({ name: s.name, proficiency: s.proficiency_level })),
          employee.aspiration_short,
          topMatches.map((m: any) => ({
            title: m.title,
            team: m.role_title,
            matchScore: m.match_score,
            description: '',
          }))
        );

        if (blurbs.length > 0) {
          personalizedNote = blurbs.map((b) => b.personalizedBlurb).join(' ');
        }
      } catch {
        // Fall through to default note
      }
    }

    // Top 2 matches + 1 stretch
    const primaryMatches = topMatches.slice(0, 2);
    stretchRole = topMatches[2] ?? null;

    // Build match HTML
    let matchesHtml = '';
    for (const match of primaryMatches) {
      matchesHtml += `
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 16px; color: #1a1a2e;">${match.title}</h3>
            <span style="background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">${match.match_score}%</span>
          </div>
          <p style="margin: 8px 0 0; color: #666; font-size: 14px;">${match.role_title}</p>
        </div>`;
    }

    // Stretch role
    let stretchHtml = '';
    if (stretchRole) {
      stretchHtml = `
        <div style="margin-top: 24px;">
          <h2 style="color: #1a1a2e; font-size: 18px;">🎯 Stretch Role</h2>
          <p style="color: #666; font-size: 14px;">You're close to qualifying for this — keep building!</p>
          <div style="padding: 16px; border: 2px dashed #f59e0b; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0; font-size: 16px; color: #1a1a2e;">${stretchRole.title}</h3>
              <span style="background: #fef3c7; color: #b45309; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">${stretchRole.match_score}%</span>
            </div>
            <p style="margin: 8px 0 0; color: #666; font-size: 14px;">${stretchRole.role_title}</p>
          </div>
        </div>`;
    }

    const html = DIGEST_HTML_TEMPLATE
      .replace('{{WEEK_OF}}', weekOf)
      .replace('{{PERSONALIZED_NOTE}}', personalizedNote)
      .replace('{{MATCHES_HTML}}', matchesHtml)
      .replace('{{STRETCH_HTML}}', stretchHtml);

    // Send email
    if (env.SMTP_HOST) {
      await transporter.sendMail({
        from: env.DIGEST_FROM,
        to: employee.email,
        subject: `Your TalentCircuit Digest — ${weekOf}`,
        html,
      });
    }

    // Log the digest
    await execute(
      `INSERT INTO digest_log (id, user_id, digest_data)
       VALUES ($1, $2, $3::jsonb)`,
      [uuid(), employee.id, JSON.stringify({ topMatches, weekOf })]
    );
  }

  /**
   * Preview the digest for the current week without sending.
   */
  async previewDigest(userId: string) {
    const user = await queryOne<any>(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    if (!user) return null;

    const topMatches = await matchingService.findTopJobsForEmployee(user.id, user.company_id);

    return {
      user: { id: user.id, fullName: user.full_name },
      topMatches: topMatches.slice(0, 2).map((m: any) => ({
        postingId: m.id,
        title: m.title,
        team: m.role_title,
        matchScore: m.match_score,
        description: '',
      })),
      stretchRole: topMatches[2]
        ? { postingId: topMatches[2].id, title: topMatches[2].title, team: topMatches[2].role_title, matchScore: topMatches[2].match_score, description: '' }
        : null,
      weekOf: new Date().toISOString().slice(0, 10),
    };
  }
}
