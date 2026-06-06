import { Request, Response, NextFunction } from 'express';

export function sanitizeJobListings(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (body && body.data && Array.isArray(body.data) && req.user?.role === 'employee') {
      body.data = body.data.map((job: any) => {
        const { applicantCount, internalNotes, ...safe } = job;
        return safe;
      });
    }
    return originalJson(body);
  };
  next();
}

export function anonymizeInterestData(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (body && body.interests && req.user?.role === 'employee') {
      body.interests = { count: Array.isArray(body.interests) ? body.interests.length : (body.interests.count || 0) };
    }
    return originalJson(body);
  };
  next();
}

export function protectAspirationData(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (body && body.aspirationShort && req.user?.role !== 'employee' && body.id !== req.user?.id) {
      body.aspirationShort = undefined;
      body.aspirationLong = undefined;
    }
    return originalJson(body);
  };
  next();
}
