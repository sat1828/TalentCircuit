import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/database', () => ({
  queryOne: vi.fn(),
}));

vi.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    CORS_ORIGIN: 'http://localhost:5173',
  },
  isDev: false,
  isProd: false,
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock-token'),
    verify: vi.fn(() => ({
      id: 'user-1',
      companyId: 'company-1',
      email: 'test@example.com',
      role: 'employee',
      fullName: 'Test User',
    })),
  },
}));

import { authenticate, checkRole, checkCompanyScope, generateTokens } from '../middleware/auth';
import type { AuthUser } from '../middleware/auth';

function mockReqRes() {
  const req: any = {
    headers: {},
    params: {},
    body: {},
    user: undefined,
  };
  const res: any = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('authenticate', () => {
  it('returns 401 when auth header is missing', () => {
    const { req, res, next } = mockReqRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when auth header does not start with Bearer', () => {
    const { req, res, next } = mockReqRes();
    req.headers.authorization = 'Basic abc123';
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('calls next when token is valid and user is active', async () => {
    const { queryOne } = await import('../config/database');
    (queryOne as any).mockResolvedValue({ is_active: true });

    const { req, res, next } = mockReqRes();
    req.headers.authorization = 'Bearer valid-token';
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe('user-1');
  });
});

describe('checkRole', () => {
  it('allows user with matching role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'manager' } as AuthUser;
    const middleware = checkRole('manager' as any, 'hr_admin' as any);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('denies user without matching role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'employee' } as AuthUser;
    const middleware = checkRole('manager' as any);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 401 when no user is attached', () => {
    const { req, res, next } = mockReqRes();
    const middleware = checkRole('manager' as any);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('checkCompanyScope', () => {
  it('allows request when companyId matches', async () => {
    const { req, res, next } = mockReqRes();
    req.user = { companyId: 'company-1' } as AuthUser;
    req.params.companyId = 'company-1';
    await checkCompanyScope(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks cross-company access', async () => {
    const { req, res, next } = mockReqRes();
    req.user = { companyId: 'company-1' } as AuthUser;
    req.params.companyId = 'company-2';
    await checkCompanyScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('generateTokens', () => {
  it('returns access and refresh tokens', () => {
    const user: AuthUser = {
      id: 'user-1',
      companyId: 'company-1',
      email: 'test@example.com',
      role: 'employee' as any,
      fullName: 'Test User',
    };
    const tokens = generateTokens(user);
    expect(tokens).toHaveProperty('accessToken');
    expect(tokens).toHaveProperty('refreshToken');
  });
});
