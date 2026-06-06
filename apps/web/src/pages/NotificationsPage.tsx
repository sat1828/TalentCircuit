import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../lib/api';
import { useNotificationStore } from '../store/notificationStore';
import { Bell, CheckCheck, Loader2, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

export function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifications, isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (ids?: string[]) => notificationsApi.markRead(ids ?? []),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      useNotificationStore.getState().setNotifications([]);
    },
  });

  useEffect(() => {
    if (notifications) {
      useNotificationStore.getState().setNotifications(notifications);
    }
  }, [notifications]);

  const handleMarkAllRead = () => {
    markRead.mutate(undefined);
    toast.success('All notifications marked as read');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Notifications</h1>
          <p className="text-sm text-secondary mt-1">Stay updated with your latest activity</p>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={markRead.isPending}
          className="btn-secondary btn-sm"
        >
          <CheckCheck size={16} className="mr-1.5" />
          Mark All Read
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-4">
              <div className="skeleton h-5 w-3/4 mb-2" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card p-8 text-center">
          <Bell size={40} className="mx-auto mb-3 text-secondary" />
          <p className="text-secondary">Failed to load notifications</p>
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <div className="glass-card p-12 text-center animate-slide-up">
          <Inbox size={48} className="mx-auto mb-4 text-secondary" />
          <h3 className="text-lg font-semibold mb-1">All caught up!</h3>
          <p className="text-sm text-secondary">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any, i: number) => (
            <div
              key={n.id}
              className={`glass-card p-4 flex items-start gap-4 animate-slide-up`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                n.is_read ? 'bg-[rgb(var(--color-surface-alt))]' : 'bg-brand-500/10'
              }`}>
                <Bell size={18} className={n.is_read ? 'text-secondary' : 'text-brand-600'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.is_read ? 'text-secondary' : 'font-medium'}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-muted mt-0.5">{n.body}</p>
                )}
                <p className="text-[11px] text-muted mt-1">
                  {new Date(n.created_at || n.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => markRead.mutate([n.id])}
                  className="p-1.5 rounded-lg hover:bg-brand-500/10 text-secondary hover:text-brand-600 transition-colors"
                  title="Mark as read"
                >
                  <CheckCheck size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
