import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UserCircle, Briefcase, Route, Bell, Users,
  BarChart3, LogOut, Menu, X, Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationStore } from '../../store/notificationStore';
import { ThemeToggle } from '../ui/ThemeToggle';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['employee', 'manager', 'hr_admin', 'super_admin'] },
  { label: 'My Profile', path: '/profile', icon: UserCircle, roles: ['employee', 'manager', 'hr_admin', 'super_admin'] },
  { label: 'Job Board', path: '/jobs', icon: Briefcase, roles: ['employee', 'manager', 'hr_admin', 'super_admin'] },
  { label: 'Career Path', path: '/career-path', icon: Route, roles: ['employee'] },
  { label: 'Hidden Talent', path: '/manager/talent', icon: Users, roles: ['manager'] },
  { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['employee', 'manager', 'hr_admin', 'super_admin'] },
  { label: 'Admin', path: '/admin', icon: BarChart3, roles: ['hr_admin', 'super_admin'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 glass-sidebar transform transition-all duration-300 lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-[rgb(var(--color-border))]">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/30 transition-shadow">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">TalentCircuit</span>
          </Link>
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-[rgb(var(--color-text)_/_0.05)] transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="p-3 space-y-0.5">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={clsx('nav-link group', isActive && 'active')}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.label === 'Notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[rgb(var(--color-text)_/_0.03)] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-sm">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{user?.fullName}</p>
              <p className="text-xs text-secondary truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-secondary hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-[rgb(var(--color-border))]" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
          <button className="lg:hidden p-2 rounded-xl hover:bg-[rgb(var(--color-text)_/_0.05)] transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl hover:bg-[rgb(var(--color-text)_/_0.05)] transition-colors"
            >
              <Bell size={20} className="text-secondary" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
