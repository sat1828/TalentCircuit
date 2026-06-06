import { useState, useMemo } from 'react';
import { useJobs, useExpressInterest, useApply, useApplications } from '../hooks/useJobs';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Briefcase, Search, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, AlertCircle, X, User,
  Calendar,
} from 'lucide-react';

const PAGE_SIZE = 6;

function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-5 w-3/5" />
          <div className="skeleton h-3 w-2/5" />
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton h-3 w-1/2" />
      <div className="flex gap-2">
        <div className="skeleton h-8 w-28 rounded-xl" />
        <div className="skeleton h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}

export function JobsPage() {
  const { data, isLoading, isError, refetch } = useJobs({ status: 'open' });
  const { data: applications } = useApplications();
  const expressInterest = useExpressInterest();
  const apply = useApply();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const appliedIds = useMemo(() => {
    if (!Array.isArray(applications)) return new Set<string>();
    return new Set(applications.map((a: any) => a.posting_id));
  }, [applications]);

  const jobs = useMemo(() => {
    const list = data?.data ?? [];
    return list.filter((job: any) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = job.title?.toLowerCase().includes(q);
        const matchesRole = job.roleTitle?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesRole) return false;
      }
      if (typeFilter && job.postingType !== typeFilter) return false;
      if (statusFilter && job.status !== statusFilter) return false;
      return true;
    });
  }, [data, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageJobs = jobs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const postingTypeLabel = (t: string) => {
    switch (t) {
      case 'full_transfer': return 'Full Transfer';
      case 'gig': return 'Short-term Gig';
      case 'shadowing': return 'Shadowing';
      default: return t;
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const handleExpressInterest = async (jobId: string) => {
    setActionLoadingId(jobId);
    try {
      await expressInterest.mutateAsync(jobId);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApply = async (jobId: string) => {
    setActionLoadingId(jobId);
    try {
      await apply.mutateAsync(jobId);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="relative max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Floating orbs */}
      <div className="floating-orb w-72 h-72 bg-purple-500/20 -top-32 -left-32" />
      <div className="floating-orb w-96 h-96 bg-brand-500/15 top-1/3 -right-48" style={{ animationDelay: '-4s' }} />

      {/* Header */}
      <div className="glass-card p-8">
        <h1 className="text-3xl font-bold gradient-text">Job Board</h1>
        <p className="text-secondary mt-1">Discover roles that match your skills</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="glass-input pl-10"
            placeholder="Search roles, teams, departments..."
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="glass-input w-auto min-w-[140px]"
        >
          <option value="">All Types</option>
          <option value="full_transfer">Full Transfer</option>
          <option value="gig">Short-term Gig</option>
          <option value="shadowing">Shadowing</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="glass-input w-auto min-w-[130px]"
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="">All Status</option>
        </select>
      </div>

      {/* Error state */}
      {isError && (
        <div className="glass-card p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>Failed to load jobs</h2>
          <p className="text-secondary mb-4">Something went wrong. Please try again.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && jobs.length === 0 && (
        <div className="glass-card p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--color-surface-alt))' }}>
            <Briefcase className="w-8 h-8 text-muted" />
          </div>
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>No jobs found</h2>
          <p className="text-secondary mb-4">
            {search || typeFilter || statusFilter !== 'open'
              ? 'Try adjusting your search or filters.'
              : 'No open roles match your criteria.'}
          </p>
          {(search || typeFilter || statusFilter !== 'open') && (
            <Button
              variant="secondary"
              onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter('open'); setPage(1); }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Results grid */}
      {!isLoading && !isError && jobs.length > 0 && (
        <>
          <p className="text-sm text-secondary">
            Showing <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{jobs.length}</span> job{jobs.length !== 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pageJobs.map((job: any) => {
              const alreadyApplied = appliedIds.has(job.id);
              const isLoadingAction = actionLoadingId === job.id;

              return (
                <div key={job.id} className="glass-card p-5 animate-slide-up">
                  {/* Title + match score */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>
                        {job.title}
                      </h3>
                    </div>
                    {job.matchScore !== null && job.matchScore !== undefined && (
                      <Badge
                        variant={job.matchScore >= 80 ? 'green' : job.matchScore >= 60 ? 'blue' : 'yellow'}
                        className="shrink-0"
                      >
                        {job.matchScore}% match
                      </Badge>
                    )}
                  </div>

                  {/* Role title, department, posting type */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-secondary">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                      {job.roleTitle}
                    </span>
                    {job.department && (
                      <span>{job.department}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {postingTypeLabel(job.postingType)}
                    </span>
                  </div>

                  {/* Posted by + date */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted">
                    {job.postedBy && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 shrink-0" />
                        {job.postedBy}
                      </span>
                    )}
                    {job.createdAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {formatDate(job.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Required skills count */}
                  {job.skills?.length > 0 && (
                    <p className="mt-2 text-xs text-muted">
                      {job.skills.length} required skill{job.skills.length !== 1 ? 's' : ''}
                    </p>
                  )}

                  {/* Actions / Applied indicator */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {alreadyApplied ? (
                      <span className="badge-green">Applied</span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleExpressInterest(job.id)}
                          loading={isLoadingAction && expressInterest.isPending}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Express Interest
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApply(job.id)}
                          loading={isLoadingAction && apply.isPending}
                        >
                          Apply Now
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="btn-secondary btn-sm flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`btn-sm min-w-[32px] ${
                    n === safePage ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="btn-secondary btn-sm flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
