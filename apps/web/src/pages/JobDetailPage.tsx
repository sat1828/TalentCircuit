import { useParams, useNavigate, Link } from 'react-router-dom';
import { useJob, useApply, useExpressInterest, useApplications } from '../hooks/useJobs';
import { useGapAnalysis } from '../hooks/useGapAnalysis';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Briefcase, BarChart3,
  BookOpen, CheckCircle2, AlertTriangle, Lightbulb,
  Sparkles, Send, Users, Eye, Loader2, ArrowLeft, User,
  Calendar, Zap, Star, AlertCircle,
} from 'lucide-react';
import { useState } from 'react';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJob(id!);
  const apply = useApply();
  const expressInterest = useExpressInterest();
  const { data: applications } = useApplications();
  const [analysisRequested, setAnalysisRequested] = useState(false);
  const gapId = analysisRequested ? id! : '';
  const { data: gapAnalysis, isLoading: gapLoading, isFetching, isError: gapError } = useGapAnalysis(gapId);
  const user = useAuthStore((s) => s.user);
  const [showApply, setShowApply] = useState(false);
  const [showTalent, setShowTalent] = useState(false);

  const appliedIds = new Set(
    (Array.isArray(applications) ? applications : []).map((a: any) => a.posting_id)
  );
  const hasApplied = appliedIds.has(id);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="skeleton h-5 w-28" />
        <div className="glass-card p-6 space-y-4">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-20 w-full" />
        </div>
        <div className="glass-card p-6 space-y-3">
          <div className="skeleton h-6 w-32" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
        <div className="flex gap-3">
          <div className="skeleton h-10 w-36" />
          <div className="skeleton h-10 w-36" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>Job Not Found</h2>
          <p className="text-secondary mb-4">This job posting doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/jobs')} icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  const handleApply = async () => {
    await apply.mutateAsync(id!);
    setShowApply(false);
    navigate('/jobs');
  };

  const handleInterest = () => {
    expressInterest.mutate(id!);
  };

  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'hr_admin' || user?.role === 'super_admin';
  const isEmployee = user?.role === 'employee';

  const postingTypeLabel = job.postingType === 'full_transfer' ? 'Full Transfer' : job.postingType === 'gig' ? 'Short-term Gig' : 'Shadowing';
  const postingTypeBadgeVariant = job.postingType === 'full_transfer' ? 'blue' : job.postingType === 'gig' ? 'purple' : 'yellow' as 'blue' | 'purple' | 'yellow';
  const statusBadgeVariant = job.status === 'open' ? 'green' : job.status === 'closed' ? 'red' : 'gray' as 'green' | 'red' | 'gray';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="floating-orb w-72 h-72 bg-brand-500/10 -top-32 -left-32" style={{ animationDelay: '0s' }} />
      <div className="floating-orb w-48 h-48 bg-purple-500/10 bottom-0 -right-24" style={{ animationDelay: '-4s' }} />

      <button
        onClick={() => navigate('/jobs')}
        className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-brand-500 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to jobs
      </button>

      <div className="glass-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold gradient-text">{job.title}</h1>
              <Badge variant={statusBadgeVariant}>{job.status ?? 'open'}</Badge>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-sm text-secondary">
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" />
                {job.roleTitle}
              </span>
              {job.department && (
                <>
                  <span className="text-muted">·</span>
                  <span>{job.department}</span>
                </>
              )}
              <span className="text-muted">·</span>
              <Badge variant={postingTypeBadgeVariant}>{postingTypeLabel}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted">
              {job.postedBy && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {typeof job.postedBy === 'object' ? job.postedBy.fullName ?? job.postedBy.email : job.postedBy}
                </span>
              )}
              {job.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(job.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          {job.matchScore != null && (
            <Badge variant={job.matchScore >= 80 ? 'green' : job.matchScore >= 60 ? 'blue' : 'yellow'} className="text-base px-4 py-1">
              {job.matchScore}% match
            </Badge>
          )}
        </div>

        {job.description && (
          <div className="mt-5 pt-5 border-t border-[rgb(var(--color-border))]">
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>Description</h2>
            <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">{job.description}</p>
          </div>
        )}
      </div>

      {job.skills?.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
            <Zap className="w-4 h-4 text-brand-500" />
            Required Skills
          </h2>
          <div className="space-y-2">
            {job.skills.map((skill: any) => (
              <div key={skill.skillId} className="flex items-center justify-between py-2.5 px-4 rounded-xl" style={{ background: 'rgb(var(--color-surface-alt))' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{skill.skillName}</span>
                  {skill.category && <Badge variant="purple" size="sm">{skill.category}</Badge>}
                  {skill.isRequired ? (
                    <Badge variant="blue" size="sm">Required</Badge>
                  ) : (
                    <Badge variant="yellow" size="sm">Optional</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted">Level {skill.requiredProficiency}/5</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i < skill.requiredProficiency
                            ? 'bg-brand-500'
                            : 'bg-[rgb(var(--color-border))]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {isEmployee && (
          <>
            <Button
              onClick={handleInterest}
              variant="secondary"
              icon={<Eye className="w-4 h-4" />}
              disabled={hasApplied || expressInterest.isPending}
              loading={expressInterest.isPending}
            >
              {hasApplied ? 'Applied' : "I'm Interested"}
            </Button>
            <Button
              onClick={() => setShowApply(true)}
              icon={<Send className="w-4 h-4" />}
              disabled={hasApplied || apply.isPending}
            >
              {hasApplied ? 'Applied' : 'Apply Now'}
            </Button>
            <Button
              onClick={() => { setAnalysisRequested(true); }}
              variant="secondary"
              icon={<Sparkles className="w-4 h-4" />}
            >
              {analysisRequested && (gapLoading || isFetching) ? 'Analyzing...' : 'Analyze My Fit'}
            </Button>
          </>
        )}
        {isManagerOrAdmin && (
          <div className="flex flex-wrap gap-3">
            <Link to="/manager/talent">
              <Button variant="secondary" icon={<Users className="w-4 h-4" />}>
                Hidden Talent
              </Button>
            </Link>
            <Button onClick={() => setShowTalent(true)} variant="secondary" icon={<BarChart3 className="w-4 h-4" />}>
              Match Analysis
            </Button>
          </div>
        )}
      </div>

      {analysisRequested && (
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <Sparkles className="w-5 h-5 text-brand-500" />
              Skill Gap Analysis
            </h2>
            <button
              onClick={() => setAnalysisRequested(false)}
              className="text-xs text-muted hover:text-secondary transition-colors"
            >
              Hide
            </button>
          </div>

          {gapLoading || isFetching ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="relative">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <div className="absolute inset-0 animate-pulse rounded-full bg-brand-500/10" style={{ transform: 'scale(1.8)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>Analyzing your profile...</p>
                <p className="text-xs text-muted mt-1">Claude is matching your skills against this role</p>
              </div>
            </div>
          ) : gapError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
              <p className="text-sm text-secondary mb-3">Failed to analyze your fit. Please try again.</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setAnalysisRequested(false); setTimeout(() => setAnalysisRequested(true), 100); }}
              >
                Retry
              </Button>
            </div>
          ) : gapAnalysis ? (
            <div className="space-y-5">
              <div className="flex items-center gap-5 p-5 rounded-xl" style={{ background: 'rgb(var(--color-surface-alt))' }}>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <span className="text-3xl font-bold text-white">{gapAnalysis.matchScore}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Match Score</p>
                  {gapAnalysis.assessment && (
                    <p className="text-sm text-secondary mt-1">{gapAnalysis.assessment}</p>
                  )}
                </div>
              </div>

              {gapAnalysis.strengths?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-600 flex items-center gap-1.5 mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Strengths
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {gapAnalysis.strengths.map((s: any, i: number) => (
                      <Badge key={i} variant="green" size="md">
                        {s.skillName} · Level {s.currentProficiency}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {gapAnalysis.gaps?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-600 flex items-center gap-1.5 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Gaps to Address
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {gapAnalysis.gaps.map((g: any, i: number) => (
                      <Badge key={i} variant="yellow" size="md">
                        {g.skillName} · Need {g.requiredProficiency} (at {g.currentProficiency})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {gapAnalysis.learningPlan?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                    <BookOpen className="w-4 h-4 text-brand-500" />
                    90-Day Learning Plan
                  </h3>
                  <div className="space-y-3">
                    {gapAnalysis.learningPlan.map((plan: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl" style={{ background: 'rgb(var(--color-surface-alt))' }}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{plan.skillName}</p>
                          <Badge variant="purple" size="sm">{plan.timeframe}</Badge>
                        </div>
                        <p className="text-xs text-secondary">{plan.milestone}</p>
                        {plan.resources?.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {plan.resources.map((r: any, ri: number) => (
                              <div key={ri} className="flex items-center gap-2 text-xs text-muted">
                                <Lightbulb className="w-3 h-3 text-brand-400 flex-shrink-0" />
                                <span>{r.title}</span>
                                <Badge variant="gray" size="sm">{r.type}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {gapAnalysis.cached && (
                <p className="text-xs text-muted flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Analysis cached. Generated by Claude.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted" />
              <p className="text-sm text-muted">Click "Analyze My Fit" to get a personalized analysis</p>
            </div>
          )}
        </div>
      )}

      {isManagerOrAdmin && showTalent && (
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <Users className="w-5 h-5 text-brand-500" />
              Match Analysis
            </h2>
            <button
              onClick={() => setShowTalent(false)}
              className="text-xs text-muted hover:text-secondary transition-colors"
            >
              Hide
            </button>
          </div>
          {!analysisRequested ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted mb-3">Run a skill gap analysis to see talent insights</p>
              <Button
                size="sm"
                variant="secondary"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={() => { setAnalysisRequested(true); }}
              >
                Analyze Matching Talent
              </Button>
            </div>
          ) : gapLoading || isFetching ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              <span className="text-sm text-secondary">Analyzing talent pool...</span>
            </div>
          ) : gapAnalysis ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgb(var(--color-surface-alt))' }}>
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">{gapAnalysis.matchScore}%</span>
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>Average Match Score</p>
                  <p className="text-xs text-secondary mt-0.5">Based on skill gap analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/manager/talent">
                  <Button size="sm" variant="secondary" icon={<Users className="w-4 h-4" />}>
                    View Full Talent Pool
                  </Button>
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Modal open={showApply} onClose={() => setShowApply(false)} title="Confirm Application">
        <p className="text-sm text-secondary mb-4">
          Apply to <strong style={{ color: 'rgb(var(--color-text))' }}>{job.title}</strong>?
          {job.isAnonymousApply !== false && (
            <span className="block mt-2 text-amber-600 text-xs">
              Your current manager will only be notified after the hiring manager selects you for an interview.
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <Button onClick={handleApply} loading={apply.isPending} icon={<Send className="w-4 h-4" />}>
            Submit Application
          </Button>
          <Button onClick={() => setShowApply(false)} variant="secondary">
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
