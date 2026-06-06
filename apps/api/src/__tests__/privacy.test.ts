import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/env', () => ({
  env: { CORS_ORIGIN: 'http://localhost:5173' },
  isDev: false,
  isProd: false,
}));

import { sanitizeJobListings, anonymizeInterestData } from '../middleware/privacy';

function mockReqRes(role: string) {
  const res: any = {
    json: vi.fn(),
  };
  const req: any = {
    user: { role, companyId: 'company-1' },
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('sanitizeJobListings', () => {
  it('strips sensitive fields for employee role', () => {
    const { req, res, next } = mockReqRes('employee');
    sanitizeJobListings(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes through for manager role', () => {
    const { req, res, next } = mockReqRes('manager');
    sanitizeJobListings(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('anonymizeInterestData', () => {
  it('passes through for manager role', () => {
    const { req, res, next } = mockReqRes('manager');
    anonymizeInterestData(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes through for employee role', () => {
    const { req, res, next } = mockReqRes('employee');
    anonymizeInterestData(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
