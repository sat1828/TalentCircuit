import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { pool } from './config/database';
import { env } from './config/env';

async function seed() {
  console.log('[Seed] Starting database seed...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Company ──
    const companyId = uuid();
    await client.query(
      `INSERT INTO companies (id, name, domain) VALUES ($1, $2, $3)`,
      [companyId, env.COMPANY_NAME, env.COMPANY_DOMAIN]
    );
    console.log(`[Seed] Created company: ${env.COMPANY_NAME}`);

    // ── Teams ──
    const teams = ['Engineering', 'Product', 'Design', 'Data', 'DevOps', 'QA', 'Marketing', 'Sales', 'HR', 'Finance'];
    const teamIds: string[] = [];
    for (const team of teams) {
      const id = uuid();
      await client.query(
        `INSERT INTO teams (id, company_id, name) VALUES ($1, $2, $3)`,
        [id, companyId, team]
      );
      teamIds.push(id);
    }
    console.log(`[Seed] Created ${teams.length} teams`);

    // ── Skills ──
    const skillData = [
      // Technical
      { name: 'JavaScript', category: 'technical', parent: null },
      { name: 'TypeScript', category: 'technical', parent: 'JavaScript' },
      { name: 'React', category: 'technical', parent: 'JavaScript' },
      { name: 'Vue.js', category: 'technical', parent: 'JavaScript' },
      { name: 'Angular', category: 'technical', parent: 'JavaScript' },
      { name: 'Node.js', category: 'technical', parent: 'JavaScript' },
      { name: 'Express.js', category: 'technical', parent: 'Node.js' },
      { name: 'Python', category: 'technical', parent: null },
      { name: 'Django', category: 'technical', parent: 'Python' },
      { name: 'Flask', category: 'technical', parent: 'Python' },
      { name: 'Java', category: 'technical', parent: null },
      { name: 'Spring Boot', category: 'technical', parent: 'Java' },
      { name: 'Go', category: 'technical', parent: null },
      { name: 'Rust', category: 'technical', parent: null },
      { name: 'SQL', category: 'technical', parent: null },
      { name: 'PostgreSQL', category: 'technical', parent: 'SQL' },
      { name: 'MongoDB', category: 'technical', parent: null },
      { name: 'Redis', category: 'technical', parent: null },
      { name: 'Docker', category: 'technical', parent: null },
      { name: 'Kubernetes', category: 'technical', parent: null },
      { name: 'AWS', category: 'technical', parent: null },
      { name: 'GCP', category: 'technical', parent: null },
      { name: 'Azure', category: 'technical', parent: null },
      { name: 'Git', category: 'technical', parent: null },
      { name: 'CI/CD', category: 'technical', parent: null },
      { name: 'GraphQL', category: 'technical', parent: null },
      { name: 'REST API', category: 'technical', parent: null },
      { name: 'HTML/CSS', category: 'technical', parent: null },
      { name: 'Tailwind CSS', category: 'technical', parent: 'HTML/CSS' },
      { name: 'Sass/SCSS', category: 'technical', parent: 'HTML/CSS' },
      { name: 'Test-Driven Development', category: 'technical', parent: null },
      { name: 'Agile/Scrum', category: 'soft', parent: null },
      { name: 'System Design', category: 'technical', parent: null },
      { name: 'Data Structures', category: 'technical', parent: null },
      { name: 'Algorithms', category: 'technical', parent: null },
      { name: 'Machine Learning', category: 'technical', parent: 'Python' },
      { name: 'Deep Learning', category: 'technical', parent: 'Machine Learning' },
      { name: 'NLP', category: 'technical', parent: 'Machine Learning' },
      { name: 'Data Analysis', category: 'domain', parent: null },
      { name: 'Product Management', category: 'domain', parent: null },
      { name: 'UX Research', category: 'domain', parent: null },
      { name: 'UI Design', category: 'domain', parent: null },
      { name: 'Figma', category: 'tool', parent: null },
      { name: 'Jira', category: 'tool', parent: null },
      { name: 'Confluence', category: 'tool', parent: null },
      // Soft skills
      { name: 'Communication', category: 'soft', parent: null },
      { name: 'Leadership', category: 'soft', parent: null },
      { name: 'Mentoring', category: 'soft', parent: null },
      { name: 'Cross-functional Collaboration', category: 'soft', parent: null },
      { name: 'Stakeholder Management', category: 'soft', parent: null },
      { name: 'Technical Writing', category: 'soft', parent: null },
    ];

    const skillMap = new Map<string, string>(); // name -> id
    for (const skill of skillData) {
      const id = uuid();
      if (skill.parent) {
        const parentId = skillMap.get(skill.parent);
        await client.query(
          `INSERT INTO skills (id, name, category, parent_skill_id) VALUES ($1, $2, $3, $4)`,
          [id, skill.name, skill.category, parentId ?? null]
        );
      } else {
        await client.query(
          `INSERT INTO skills (id, name, category) VALUES ($1, $2, $3)`,
          [id, skill.name, skill.category]
        );
      }
      skillMap.set(skill.name, id);
    }
    console.log(`[Seed] Created ${skillData.length} skills`);

    // ── Roles ──
    const roleData = [
      { title: 'Junior Frontend Developer', level: 'junior', department: 'Engineering' },
      { title: 'Frontend Developer', level: 'mid', department: 'Engineering' },
      { title: 'Senior Frontend Developer', level: 'senior', department: 'Engineering' },
      { title: 'Junior Backend Developer', level: 'junior', department: 'Engineering' },
      { title: 'Backend Developer', level: 'mid', department: 'Engineering' },
      { title: 'Senior Backend Developer', level: 'senior', department: 'Engineering' },
      { title: 'Full Stack Developer', level: 'mid', department: 'Engineering' },
      { title: 'Senior Full Stack Developer', level: 'senior', department: 'Engineering' },
      { title: 'DevOps Engineer', level: 'mid', department: 'DevOps' },
      { title: 'Senior DevOps Engineer', level: 'senior', department: 'DevOps' },
      { title: 'Data Engineer', level: 'mid', department: 'Data' },
      { title: 'Data Scientist', level: 'mid', department: 'Data' },
      { title: 'QA Engineer', level: 'mid', department: 'QA' },
      { title: 'Engineering Manager', level: 'manager', department: 'Engineering' },
      { title: 'Product Manager', level: 'mid', department: 'Product' },
      { title: 'Senior Product Manager', level: 'senior', department: 'Product' },
      { title: 'Product Designer', level: 'mid', department: 'Design' },
      { title: 'UX Researcher', level: 'mid', department: 'Design' },
      { title: 'Tech Lead', level: 'lead', department: 'Engineering' },
      { title: 'Engineering Director', level: 'director', department: 'Engineering' },
      { title: 'HR Manager', level: 'manager', department: 'HR' },
      { title: 'VP of Engineering', level: 'director', department: 'Engineering' },
    ];

    const roleIds: string[] = [];
    for (const role of roleData) {
      const id = uuid();
      await client.query(
        `INSERT INTO roles (id, company_id, title, level, department) VALUES ($1, $2, $3, $4, $5)`,
        [id, companyId, role.title, role.level, role.department]
      );
      roleIds.push(id);
    }
    console.log(`[Seed] Created ${roleData.length} roles`);

    // ── Role Skill Requirements ──
    const roleSkillMap: Record<string, [string, number, boolean][]> = {
      'Frontend Developer': [
        ['JavaScript', 4, true],
        ['React', 4, true],
        ['TypeScript', 3, true],
        ['HTML/CSS', 4, true],
        ['Git', 3, true],
        ['REST API', 3, true],
        ['Communication', 3, false],
      ],
      'Senior Frontend Developer': [
        ['JavaScript', 5, true],
        ['React', 5, true],
        ['TypeScript', 4, true],
        ['HTML/CSS', 4, true],
        ['System Design', 3, true],
        ['Git', 3, true],
        ['CI/CD', 3, false],
        ['Mentoring', 3, false],
        ['Communication', 4, false],
      ],
      'Backend Developer': [
        ['Node.js', 4, true],
        ['Express.js', 4, true],
        ['PostgreSQL', 3, true],
        ['TypeScript', 3, true],
        ['REST API', 4, true],
        ['Git', 3, true],
        ['Docker', 2, false],
        ['Redis', 2, false],
      ],
      'Senior Backend Developer': [
        ['Node.js', 5, true],
        ['Express.js', 5, true],
        ['PostgreSQL', 4, true],
        ['TypeScript', 4, true],
        ['System Design', 4, true],
        ['Docker', 3, true],
        ['Redis', 3, false],
        ['AWS', 3, false],
        ['Mentoring', 3, false],
      ],
      'Full Stack Developer': [
        ['JavaScript', 4, true],
        ['React', 3, true],
        ['Node.js', 3, true],
        ['PostgreSQL', 3, true],
        ['TypeScript', 3, true],
        ['Git', 3, true],
        ['REST API', 3, true],
        ['HTML/CSS', 3, true],
      ],
      'DevOps Engineer': [
        ['Docker', 4, true],
        ['Kubernetes', 3, true],
        ['AWS', 4, true],
        ['CI/CD', 4, true],
        ['Linux', 4, true],
        ['Python', 3, true],
        ['Git', 3, true],
      ],
      'Data Scientist': [
        ['Python', 4, true],
        ['Machine Learning', 4, true],
        ['SQL', 4, true],
        ['Data Analysis', 4, true],
        ['Communication', 3, false],
      ],
      'Engineering Manager': [
        ['Leadership', 5, true],
        ['Mentoring', 4, true],
        ['Cross-functional Collaboration', 4, true],
        ['Communication', 5, true],
        ['Stakeholder Management', 4, true],
        ['System Design', 3, false],
        ['Agile/Scrum', 4, true],
      ],
      'Product Manager': [
        ['Product Management', 4, true],
        ['Data Analysis', 3, true],
        ['Cross-functional Collaboration', 4, true],
        ['Communication', 5, true],
        ['Stakeholder Management', 4, true],
        ['Agile/Scrum', 4, true],
        ['UX Research', 3, false],
      ],
      'Tech Lead': [
        ['System Design', 5, true],
        ['Leadership', 4, true],
        ['Mentoring', 4, true],
        ['Communication', 4, true],
        ['Cross-functional Collaboration', 4, true],
        ['Agile/Scrum', 3, false],
      ],
    };

    const roleTitleToId = new Map(roleData.map((r, i) => [r.title, roleIds[i]!]));
    for (const [roleTitle, skills] of Object.entries(roleSkillMap)) {
      const roleId = roleTitleToId.get(roleTitle);
      if (!roleId) continue;
      for (const [skillName, proficiency, isRequired] of skills) {
        const skillId = skillMap.get(skillName);
        if (!skillId) {
          console.warn(`[Seed] Skill not found: ${skillName}`);
          continue;
        }
        await client.query(
          `INSERT INTO role_skill_requirements (id, role_id, skill_id, required_proficiency, is_required) VALUES ($1, $2, $3, $4, $5)`,
          [uuid(), roleId, skillId, proficiency, isRequired]
        );
      }
    }
    console.log('[Seed] Created role skill requirements');

    // ── Users ──
    const adminHash = await bcrypt.hash('admin123', 12);
    const userHash = await bcrypt.hash('user123', 12);

    const adminId = uuid();
    await client.query(
      `INSERT INTO users (id, company_id, email, password_hash, full_name, role, team_id, current_role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [adminId, companyId, 'admin@talentcircuit.com', adminHash, 'Admin User', 'super_admin', teamIds[8], roleIds[20]]
    );

    const managerId = uuid();
    await client.query(
      `INSERT INTO users (id, company_id, email, password_hash, full_name, role, team_id, current_role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [managerId, companyId, 'manager@talentcircuit.com', adminHash, 'Deepa Sharma', 'manager', teamIds[0], roleIds[13]]
    );

    const employee1Id = uuid();
    await client.query(
      `INSERT INTO users (id, company_id, email, password_hash, full_name, role, team_id, current_role_id, manager_id, aspiration_short, aspiration_long)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [employee1Id, companyId, 'priya@talentcircuit.com', userHash, 'Priya Patel', 'employee', teamIds[0], roleIds[1], managerId,
       'Move into Product Management within 1 year',
       'Become a Director of Product in 5 years, combining my technical background with product strategy']
    );

    const employee2Id = uuid();
    await client.query(
      `INSERT INTO users (id, company_id, email, password_hash, full_name, role, team_id, current_role_id, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [employee2Id, companyId, 'arjun@talentcircuit.com', userHash, 'Arjun Singh', 'employee', teamIds[0], roleIds[4], managerId]
    );

    const employee3Id = uuid();
    await client.query(
      `INSERT INTO users (id, company_id, email, password_hash, full_name, role, team_id, current_role_id, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [employee3Id, companyId, 'rahul@talentcircuit.com', userHash, 'Rahul Verma', 'employee', teamIds[3], roleIds[10], managerId]
    );

    console.log('[Seed] Created users (admin / manager / 3 employees)');

    // ── Employee Skills ──
    // Priya: frontend skills + PM aspirations
    for (const [name, level] of [['React', 4], ['JavaScript', 4], ['TypeScript', 3], ['HTML/CSS', 4], ['Git', 3], ['REST API', 3], ['Communication', 4], ['Product Management', 3], ['Data Analysis', 2], ['Cross-functional Collaboration', 3]] as [string, number][]) {
      const skillId = skillMap.get(name);
      if (skillId) {
        await client.query(
          `INSERT INTO employee_skills (id, user_id, skill_id, proficiency_level, validation_status) VALUES ($1, $2, $3, $4, $5)`,
          [uuid(), employee1Id, skillId, level, level >= 4 ? 'manager_validated' : 'self_reported']
        );
      }
    }

    // Arjun: backend skills
    for (const [name, level] of [['Node.js', 4], ['Express.js', 4], ['PostgreSQL', 3], ['TypeScript', 3], ['Python', 3], ['REST API', 4], ['Git', 3], ['Docker', 2], ['AWS', 2], ['Communication', 3]] as [string, number][]) {
      const skillId = skillMap.get(name);
      if (skillId) {
        await client.query(
          `INSERT INTO employee_skills (id, user_id, skill_id, proficiency_level) VALUES ($1, $2, $3, $4)`,
          [uuid(), employee2Id, skillId, level]
        );
      }
    }

    // Rahul: data skills
    for (const [name, level] of [['Python', 4], ['SQL', 4], ['Data Analysis', 4], ['Machine Learning', 3], ['PostgreSQL', 3], ['Git', 2], ['Communication', 3], ['REST API', 2]] as [string, number][]) {
      const skillId = skillMap.get(name);
      if (skillId) {
        await client.query(
          `INSERT INTO employee_skills (id, user_id, skill_id, proficiency_level) VALUES ($1, $2, $3, $4)`,
          [uuid(), employee3Id, skillId, level]
        );
      }
    }
    console.log('[Seed] Created employee skills');

    // ── Job Postings ──
    const postingId = uuid();
    await client.query(
      `INSERT INTO job_postings (id, company_id, role_id, posted_by, title, description, status, posting_type)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', 'full_transfer')`,
      [postingId, companyId, roleIds[14], managerId,
       'Junior Product Manager',
       'Looking for a technical PM to join the Product team. Ideal candidate has a strong engineering background and wants to transition into product management. You will work on our core platform features, define product requirements, and collaborate with engineering and design.']
    );

    const postingId2 = uuid();
    await client.query(
      `INSERT INTO job_postings (id, company_id, role_id, posted_by, title, description, status, posting_type)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', 'full_transfer')`,
      [postingId2, companyId, roleIds[16], managerId,
       'Product Designer',
       'We are looking for a Product Designer to own the end-to-end design process for our internal tools. You will work closely with product managers and engineers.']
    );

    const postingId3 = uuid();
    await client.query(
      `INSERT INTO job_postings (id, company_id, role_id, posted_by, title, description, status, posting_type)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', 'gig')`,
      [postingId3, companyId, roleIds[8], managerId,
       'DevOps Engineer (6-month project)',
       'Short-term project to migrate our infrastructure to Kubernetes. Ideal for someone looking to gain DevOps experience.']
    );

    console.log('[Seed] Created job postings');

    // ── Update profile completeness ──
    for (const uid of [employee1Id, employee2Id, employee3Id]) {
      const skills = await client.query(
        'SELECT COUNT(*) as count FROM employee_skills WHERE user_id = $1',
        [uid]
      );
      const count = parseInt(skills.rows[0]?.count ?? '0');
      const completeness = Math.min(10 + count * 15, 100);
      await client.query(
        'UPDATE users SET profile_completeness = $1 WHERE id = $2',
        [completeness, uid]
      );
    }

    await client.query('COMMIT');
    console.log('[Seed] Seed completed successfully!');
    console.log('\n── Test Accounts ──');
    console.log('Admin:   admin@talentcircuit.com / admin123');
    console.log('Manager: manager@talentcircuit.com / admin123');
    console.log('Priya:   priya@talentcircuit.com / user123');
    console.log('Arjun:   arjun@talentcircuit.com / user123');
    console.log('Rahul:   rahul@talentcircuit.com / user123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
