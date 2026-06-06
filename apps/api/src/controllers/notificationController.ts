import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';

const notificationService = new NotificationService();

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const notifications = await notificationService.getUserNotifications(req.user!.id);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body as { ids?: string[] };
    await notificationService.markAsRead(req.user!.id, ids);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
