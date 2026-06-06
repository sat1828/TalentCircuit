import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { queryOne } from '../config/database';
import { UserRole } from '@talentcircuit/shared-types';

export interface AuthUser {
  id: string;
  companyId: string;
  email: string;
  role: UserRole;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    const user = await queryOne<{ is_active: boolean }>(
      'SELECT is_active FROM users WHERE id = $1',
      [payload.id]
    );
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'Account is deactivated' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function checkRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export async function checkCompanyScope(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // If the route has a companyId param, verify it matches the user's company
  const targetCompanyId = req.params.companyId || req.body.companyId;
  if (targetCompanyId && targetCompanyId !== req.user.companyId) {
    res.status(403).json({ error: 'Cross-company access denied' });
    return;
  }

  next();
}

export function generateTokens(user: AuthUser): {
  accessToken: string;
  refreshToken: string;
} {
  const accessToken = jwt.sign(
    { id: user.id, companyId: user.companyId, email: user.email, role: user.role, fullName: user.fullName },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRY as any }
  );

  const refreshToken = jwt.sign(
    { id: user.id, companyId: user.companyId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY as any }
  );

  return { accessToken, refreshToken };
}
