import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import {
  Users, Briefcase, Target, Zap,
  Mail, RefreshCw, Database, AlertCircle,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

function StatCard({ icon: Icon, label, value, trend, gradient }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend: number;
  gradient: string;
}) {
  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${gradient} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={`flex items-center gap-0.5 text-xs font-medium ${
          trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-secondary'
        }`}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{value}</p>
      <p className="text-sm text-secondary">{label}</p>
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="skeleton w-11 h-11 rounded-xl" />
        <div className="skeleton h-4 w-12 rounded-full" />
      </div>
      <div className="skeleton h-7 w-20 mb-1" />
      <div className="skeleton h-4 w-24" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="glass-card p-5">
      <div className="skeleton h-5 w-44 mb-4" />
      <div className="skeleton h-64 w-full rounded-xl" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="glass-card p-5">
      <div className="skeleton h-5 w-36 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-4 w-16 ml-auto" />
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

const COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export function AdminPage() {
  const { data: metrics, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminApi.getMetrics().then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: skillDist } = useQuery({
    queryKey: ['admin-skill-dist'],
    queryFn: () => adminApi.getSkillDistribution().then((r) => r.data),
  });

  const [digestLoading, setDigestLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [recomputeLoading, setRecomputeLoading] = useState(false);

  const handleTriggerDigest = async () => {
    setDigestLoading(true);
    try {
      const res = await adminApi.triggerDigest();
      toast.success(res.data.message ?? 'Weekly digest triggered successfully');
    } catch {
      toast.error('Failed to trigger weekly digest');
    }
    setDigestLoading(false);
  };

  const handleSeedEmbeddings = async () => {
    setSeedLoading(true);
    try {
      const res = await adminApi.seedEmbeddings();
      toast.success(res.data.message ?? 'Embeddings seeded successfully');
    } catch {
      toast.error('Failed to seed embeddings');
    }
    setSeedLoading(false);
  };

  const handleRecomputeEmbeddings = async () => {
    setRecomputeLoading(true);
    try {
      const res = await adminApi.recomputeEmbeddings();
      toast.success(res.data.message ?? 'Embeddings recomputed successfully');
    } catch {
      toast.error('Failed to recompute embeddings');
    }
    setRecomputeLoading(false);
  };

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>Failed to load metrics</h2>
          <p className="text-secondary mb-4">Something went wrong fetching admin data. Please try again.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
          <p className="text-secondary mt-1">Organization-wide mobility metrics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleTriggerDigest} loading={digestLoading} variant="secondary" size="sm" icon={<Mail className="w-4 h-4" />}>
            Trigger Weekly Digest
          </Button>
          <Button onClick={handleSeedEmbeddings} loading={seedLoading} variant="secondary" size="sm" icon={<Database className="w-4 h-4" />}>
            Seed Embeddings
          </Button>
          <Button onClick={handleRecomputeEmbeddings} loading={recomputeLoading} variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />}>
            Recompute All Embeddings
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <SkeletonTable />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Total Employees"
              value={metrics?.totalEmployees ?? 0}
              trend={metrics?.employeeTrend ?? 0}
              gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
            />
            <StatCard
              icon={Briefcase}
              label="Active Jobs"
              value={metrics?.openRoles ?? 0}
              trend={metrics?.jobTrend ?? 0}
              gradient="bg-gradient-to-br from-blue-500 to-blue-700"
            />
            <StatCard
              icon={Target}
              label="Skill Coverage"
              value={metrics?.skillCoverage != null ? `${metrics.skillCoverage}%` : 'N/A'}
              trend={metrics?.coverageTrend ?? 0}
              gradient="bg-gradient-to-br from-green-500 to-green-700"
            />
            <StatCard
              icon={Zap}
              label="Matches"
              value={metrics?.matches ?? 0}
              trend={metrics?.matchTrend ?? 0}
              gradient="bg-gradient-to-br from-purple-500 to-purple-700"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h2 className="section-title">Department Breakdown</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.departmentBreakdown ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'rgb(var(--color-text-secondary))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--color-text-secondary))' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-glass)',
                        border: '1px solid var(--color-glass-border)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(12px)',
                      }}
                    />
                    <Bar dataKey="employees" name="Employees" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="openRoles" name="Open Roles" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="section-title">6-Month Trend</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics?.monthlyTrend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgb(var(--color-text-secondary))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--color-text-secondary))' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-glass)',
                        border: '1px solid var(--color-glass-border)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(12px)',
                      }}
                    />
                    <Line type="monotone" dataKey="internalFills" name="Internal" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="externalFills" name="External" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="section-title">Skill Distribution by Department</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Employees</th>
                    <th className="pb-3 font-medium">Open Roles</th>
                    <th className="pb-3 font-medium">Applications</th>
                    <th className="pb-3 font-medium">Mobility Rate</th>
                    <th className="pb-3 font-medium">Top Skill</th>
                  </tr>
                </thead>
                <tbody>
                  {(skillDist ?? metrics?.departmentBreakdown ?? []).map((dept: any, idx: number) => (
                    <tr key={dept.department ?? idx} className="border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
                      <td className="py-3 font-medium" style={{ color: 'rgb(var(--color-text))' }}>{dept.department}</td>
                      <td className="py-3 text-secondary">{dept.employees}</td>
                      <td className="py-3 text-secondary">{dept.openRoles}</td>
                      <td className="py-3 text-secondary">{dept.applications}</td>
                      <td className="py-3">
                        <Badge variant={dept.employees > 0 && dept.applications > 0 ? 'green' : 'gray'}>
                          {dept.employees > 0 ? `${Math.round((dept.applications / dept.employees) * 100)}%` : 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <span className="text-secondary">{dept.topSkill ?? '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
