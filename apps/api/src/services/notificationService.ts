import { v4 as uuid } from 'uuid';
import { query, queryOne, execute } from '../config/database';
import { redis } from '../config/redis';
import { Server as SocketServer } from 'socket.io';
import { NotificationType } from '@talentcircuit/shared-types';

let io: SocketServer | null = null;

export function setSocketServer(server: SocketServer) {
  io = server;
}

export class NotificationService {
  /**
   * Create an in-app notification and emit via Socket.io if connected.
   */
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    payload?: Record<string, unknown>
  ) {
    const notification = await queryOne<any>(
      `INSERT INTO notifications (id, user_id, type, title, body, payload)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [uuid(), userId, type, title, body ?? null, JSON.stringify(payload ?? {})]
    );

    // Emit real-time if socket server is available
    if (io && notification) {
      io.to(`room:${userId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        payload: notification.payload,
        isRead: false,
        createdAt: notification.created_at,
      });
    }

    // Also publish to Redis for cross-process notifications
    if (notification) {
      await redis.publish(
        'notifications',
        JSON.stringify({ userId, notification })
      );
    }

    return notification;
  }

  /**
   * Get unread notifications for a user.
   */
  async getUserNotifications(userId: string, limit = 50) {
    return query<any>(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
  }

  /**
   * Mark notifications as read.
   */
  async markAsRead(userId: string, notificationIds?: string[]) {
    if (notificationIds && notificationIds.length > 0) {
      await execute(
        `UPDATE notifications SET is_read = true
         WHERE id = ANY($1::uuid[]) AND user_id = $2`,
        [notificationIds, userId]
      );
    } else {
      await execute(
        `UPDATE notifications SET is_read = true
         WHERE user_id = $1 AND is_read = false`,
        [userId]
      );
    }
  }

  /**
   * Notify manager about a skill validation request.
   */
  async requestSkillValidation(
    employeeId: string,
    managerId: string,
    skillName: string
  ) {
    await this.notify(
      managerId,
      NotificationType.ValidationRequest,
      'Skill validation request',
      `${employeeId} has requested validation of their "${skillName}" skill.`,
      { employeeId, skillName }
    );
  }

  /**
   * Notify employee about a new matching role.
   */
  async notifyNewMatch(employeeId: string, roleTitle: string, matchScore: number, postingId: string) {
    await this.notify(
      employeeId,
      NotificationType.NewMatch,
      'New role match!',
      `A new role "${roleTitle}" matches ${matchScore}% of your skills.`,
      { postingId, matchScore }
    );
  }
}
