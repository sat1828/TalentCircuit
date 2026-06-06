import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProfile, useSkills } from '../hooks/useProfile';
import { useJobs, useApplications } from '../hooks/useJobs';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  UserCheck, Award, Briefcase, TrendingUp,
  ArrowRight, Star, Sparkles, AlertCircle,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4 animate-slide-up">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{value}</p>
        <p className="text-sm text-secondary">{label}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className="skeleton w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-7 w-16" />
        <div className="skeleton h-4 w-24" />
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-4 flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="skeleton h-5 w-3/5" />
            <div className="skeleton h-3 w-2/5" />
          </div>
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile();
  const { data: skills, isLoading: skillsLoading } = useSkills();
  const { data: jobsData, isLoading: jobsLoading, isError: jobsError } = useJobs({ limit: 3 });
  const { data: applications } = useApplications();

  const isLoading = profileLoading || skillsLoading || jobsLoading;
  const hasError = profileError || jobsError;

  const topSkills = skills?.slice(0, 5) ?? [];
  const jobCount = jobsData?.data?.length ?? 0;
  const appCount = Array.isArray(applications) ? applications.length : 0;

  if (hasError) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>Something went wrong</h2>
          <p className="text-secondary mb-4">Failed to load dashboard data. Please try again later.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Floating orbs */}
      <div className="floating-orb w-72 h-72 bg-purple-500/20 -top-32 -left-32" style={{ animationDelay: '0s' }} />
      <div className="floating-orb w-96 h-96 bg-brand-500/15 top-1/3 -right-48" style={{ animationDelay: '-4s' }} />
      <div className="floating-orb w-64 h-64 bg-blue-500/15 bottom-0 left-1/4" style={{ animationDelay: '-8s' }} />

      {/* Welcome section */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="hero-glow" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold gradient-text mb-1">
            Welcome back, {profile?.fullName?.split(' ')[0] ?? user?.fullName?.split(' ')[0] ?? 'User'}
          </h1>
          <p className="text-secondary">
            {profile?.currentRoleTitle
              ? `${profile.currentRoleTitle} · ${profile.teamName ?? 'No team'}`
              : "Let's find your next opportunity"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              icon={UserCheck}
              label="Profile Completeness"
              value={`${profile?.profileCompleteness ?? 0}%`}
              color="bg-gradient-to-br from-brand-500 to-brand-700"
            />
            <StatCard
              icon={Award}
              label="Skills"
              value={topSkills.length}
              color="bg-gradient-to-br from-blue-500 to-blue-700"
            />
            <StatCard
              icon={Briefcase}
              label="Open Roles"
              value={jobCount}
              color="bg-gradient-to-br from-green-500 to-green-700"
            />
            <StatCard
              icon={TrendingUp}
              label="Applications"
              value={appCount}
              color="bg-gradient-to-br from-purple-500 to-purple-700"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top skills */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="section-title flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-500" />
            Top Skills
          </h2>
          {topSkills.length === 0 ? (
            <p className="text-sm text-muted">No skills added yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topSkills.map((skill: any) => (
                <div
                  key={skill.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: 'rgb(var(--color-surface-alt))',
                    color: 'rgb(var(--color-text))',
                  }}
                >
                  <span>{skill.skillName}</span>
                  <span className="text-muted">·</span>
                  <span className={skill.validationStatus === 'manager_validated' ? 'text-yellow-500' : 'text-secondary'}>
                    {skill.proficiencyLevel}/5
                  </span>
                  {skill.validationStatus === 'manager_validated' && (
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
              ))}
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed"
                style={{
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text-secondary))',
                }}
              >
                + Add
              </Link>
            </div>
          )}
          <Link to="/profile" className="inline-flex items-center gap-1 text-sm font-medium mt-4 text-brand-500 hover:text-brand-600 transition-colors">
            Manage skills <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recent job matches */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="section-title flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-brand-500" />
            Recent Matches
          </h2>
          {jobsLoading ? (
            <SkeletonList />
          ) : !jobsData?.data?.length ? (
            <p className="text-sm text-muted">No open roles right now</p>
          ) : (
            <div className="space-y-3">
              {jobsData.data.slice(0, 3).map((job: any) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="block p-3 rounded-xl transition-all duration-200"
                  style={{ background: 'rgb(var(--color-surface-alt))' }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{job.title}</p>
                    {job.matchScore !== null && job.matchScore !== undefined && (
                      <Badge variant={job.matchScore >= 80 ? 'green' : job.matchScore >= 60 ? 'blue' : 'yellow'}>
                        {job.matchScore}% match
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1">{job.roleTitle}</p>
                </Link>
              ))}
              <Link to="/jobs" className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
                View all roles <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="section-title flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            <Link
              to="/profile"
              className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
              style={{ background: 'rgb(var(--color-surface-alt))' }}
            >
              <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-brand-500" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>Update Profile</p>
                <p className="text-xs text-secondary">Keep your info current</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-muted group-hover:text-brand-500 transition-colors" />
            </Link>
            <Link
              to="/jobs"
              className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
              style={{ background: 'rgb(var(--color-surface-alt))' }}
            >
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>Browse Jobs</p>
                <p className="text-xs text-secondary">Discover new opportunities</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-muted group-hover:text-brand-500 transition-colors" />
            </Link>
            <Link
              to="/career-path"
              className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
              style={{ background: 'rgb(var(--color-surface-alt))' }}
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>Career Path</p>
                <p className="text-xs text-secondary">Plan your next move</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-muted group-hover:text-brand-500 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
