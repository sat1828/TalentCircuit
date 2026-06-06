import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { queryOne, query, execute, transaction } from '../config/database';
import { generateTokens, AuthUser } from '../middleware/auth';
import { UserRole } from '@talentcircuit/shared-types';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';

interface UserRow {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  is_active: boolean;
  profile_completeness: number;
}

interface CompanyRow {
  id: string;
  name: string;
  domain: string;
}

export class AuthService {
  async register(email: string, password: string, fullName: string, companyDomain: string) {
    // Find or create company
    let company = await queryOne<CompanyRow>(
      'SELECT id, name, domain FROM companies WHERE domain = $1',
      [companyDomain]
    );

    if (!company) {
      company = await queryOne<CompanyRow>(
        `INSERT INTO companies (name, domain) VALUES ($1, $2)
         RETURNING id, name, domain`,
        [env.COMPANY_NAME, companyDomain]
      );
      if (!company) throw new AppError(500, 'Failed to create company');
    }

    // Check existing user
    const existing = await queryOne<UserRow>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing) throw new AppError(409, 'Email already registered');

    // Create user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await queryOne<UserRow>(
      `INSERT INTO users (id, company_id, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_id, email, password_hash, full_name, role, is_active, profile_completeness`,
      [uuid(), company.id, email, passwordHash, fullName]
    );
    if (!user) throw new AppError(500, 'Failed to create user');

    const authUser: AuthUser = {
      id: user.id,
      companyId: user.company_id,
      email: user.email,
      role: user.role as UserRole,
      fullName: user.full_name,
    };

    const tokens = generateTokens(authUser);

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await execute(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshTokenHash]
    );

    return {
      user: this.mapUser(user),
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await queryOne<UserRow>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    if (!user) throw new AppError(401, 'Invalid email or password');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError(401, 'Invalid email or password');

    const authUser: AuthUser = {
      id: user.id,
      companyId: user.company_id,
      email: user.email,
      role: user.role as UserRole,
      fullName: user.full_name,
    };

    const tokens = generateTokens(authUser);

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await execute(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshTokenHash]
    );

    return {
      user: this.mapUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    let payload: { id: string; companyId: string };
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as any;
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Verify token exists in DB and hash matches
    const stored = await queryOne<{ id: string; user_id: string; token_hash: string }>(
      'SELECT id, user_id, token_hash FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
      [payload.id]
    );
    if (!stored) throw new AppError(401, 'Refresh token revoked or expired');

    const hashValid = await bcrypt.compare(refreshToken, stored.token_hash);
    if (!hashValid) {
      await execute('DELETE FROM refresh_tokens WHERE user_id = $1', [payload.id]);
      throw new AppError(401, 'Refresh token mismatch — all sessions revoked');
    }

    const user = await queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [payload.id]
    );
    if (!user) throw new AppError(401, 'User not found or inactive');

    // Rotate: delete old token, issue new
    await execute('DELETE FROM refresh_tokens WHERE id = $1', [stored.id]);

    const authUser: AuthUser = {
      id: user.id,
      companyId: user.company_id,
      email: user.email,
      role: user.role as UserRole,
      fullName: user.full_name,
    };

    const tokens = generateTokens(authUser);

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await execute(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshTokenHash]
    );

    return {
      user: this.mapUser(user),
      ...tokens,
    };
  }

  async logout(userId: string) {
    await execute('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  }

  async getMe(userId: string) {
    const user = await queryOne<any>(
      `SELECT u.*, r.title as current_role_title, t.name as team_name, m.full_name as manager_name
       FROM users u
       LEFT JOIN roles r ON u.current_role_id = r.id
       LEFT JOIN teams t ON u.team_id = t.id
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.id = $1`,
      [userId]
    );
    if (!user) throw new AppError(404, 'User not found');
    return this.mapUser(user);
  }

  private mapUser(row: any) {
    return {
      id: row.id,
      companyId: row.company_id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      currentRoleId: row.current_role_id,
      currentRoleTitle: row.current_role_title || null,
      teamId: row.team_id,
      teamName: row.team_name || null,
      managerId: row.manager_id,
      managerName: row.manager_name || null,
      isActive: row.is_active,
      profileCompleteness: row.profile_completeness,
      aspirationShort: row.aspiration_short || null,
      aspirationLong: row.aspiration_long || null,
      avatarUrl: row.avatar_url || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
