import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/jobService';
import { MatchingService } from '../services/matchingService';
import { NotificationService } from '../services/notificationService';
import { z } from 'zod';
import { NotificationType } from '@talentcircuit/shared-types';

const jobService = new JobService();
const matchingService = new MatchingService();
const notificationService = new NotificationService();

const createPostingSchema = z.object({
  roleId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  postingType: z.enum(['full_transfer', 'gig', 'shadowing']),
  isAnonymousApply: z.boolean().optional(),
  applicationDeadline: z.string().optional(),
});

export async function listJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, type, department, page, limit } = req.query;
    const result = await jobService.listJobs(req.user!.id, req.user!.companyId, {
      status: status as string,
      type: type as string,
      department: department as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    // Add match scores for employees
    if (req.user?.role === 'employee') {
      const matches = await matchingService.findTopJobsForEmployee(
        req.user.id,
        req.user.companyId,
        50
      );
      const matchMap = new Map(matches.map((m) => [m.id, m.match_score]));
      result.data = result.data.map((job: any) => ({
        ...job,
        matchScore: matchMap.get(job.id) ?? null,
      }));
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getJob(req: Request, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id!;
    const job = await jobService.getJob(jobId, req.user!.companyId);

    // Add match score for employees
    if (req.user?.role === 'employee') {
      const matches = await matchingService.findTopJobsForEmployee(
        req.user.id,
        req.user.companyId,
        10
      );
      const match = matches.find((m) => m.id === jobId);
      job.matchScore = match?.match_score ?? null;
    }

    res.json(job);
  } catch (err) {
    next(err);
  }
}

export async function createPosting(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createPostingSchema.parse(req.body);
    const posting = await jobService.createPosting(
      req.user!.companyId,
      req.user!.id,
      data
    );

    // Trigger hidden talent computation + notifications
    try {
      const hiddenTalent = await matchingService.findHiddenTalent(
        posting.id,
        req.user!.companyId,
        req.user!.id,
        5
      );

      // Notify top matching employees
      for (const talent of hiddenTalent) {
        if (!talent.isAnonymous && talent.matchScore >= 80) {
          await notificationService.notifyNewMatch(
            talent.userId,
            posting.title,
            talent.matchScore,
            posting.id
          );
        }
      }
    } catch {
      // Hidden talent notification is best-effort
    }

    res.status(201).json(posting);
  } catch (err) {
    next(err);
  }
}

export async function expressInterest(req: Request, res: Response, next: NextFunction) {
  try {
    await jobService.expressInterest(req.user!.id, req.params.id!, req.user!.companyId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function apply(req: Request, res: Response, next: NextFunction) {
  try {
    const postingId = req.params.id!;
    const application = await jobService.apply(req.user!.id, postingId, req.user!.companyId);

    // Notify hiring manager
    const posting = await jobService.getJob(postingId, req.user!.companyId);
    await notificationService.notify(
      posting.postedBy,
      NotificationType.ApplicationUpdate,
      'New application received',
      `${req.user!.fullName} has applied to "${posting.title}".`,
      { applicationId: application.id, applicantId: req.user!.id }
    );

    const isAnonymous = posting.isAnonymousApply;
    res.status(201).json({
      ...application,
      message: isAnonymous
        ? 'Application submitted. Your manager will be notified only after interview selection.'
        : 'Application submitted.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const applications = await jobService.getApplications(
      req.user!.id,
      req.user!.role,
      req.user!.companyId
    );
    res.json(applications);
  } catch (err) {
    next(err);
  }
}

export async function updateApplicationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = z.object({ status: z.string() }).parse(req.body);
    const application = await jobService.updateApplicationStatus(
      req.params.postingId!,
      req.params.applicantId!,
      status,
      req.user!.id
    );
    res.json(application);
  } catch (err) {
    next(err);
  }
}

export async function getInterestCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await jobService.getInterestCount(req.params.id!, req.user!.companyId);

    // Return only count to employees, full data to managers
    if (req.user?.role === 'employee') {
      res.json({ count });
    } else {
      res.json({ count, canViewDetails: true });
    }
  } catch (err) {
    next(err);
  }
}

export async function getHiddenTalent(req: Request, res: Response, next: NextFunction) {
  try {
    const talent = await matchingService.findHiddenTalent(
      req.params.id!,
      req.user!.companyId,
      req.user!.id,
      20
    );
    res.json(talent);
  } catch (err) {
    next(err);
  }
}
