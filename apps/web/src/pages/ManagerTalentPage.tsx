import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useJobs, useHiddenTalent } from '../hooks/useJobs';
import { jobsApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Users, Eye, Send, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export function ManagerTalentPage() {
  const { data: jobsData, isLoading: jobsLoading, isError: jobsError, refetch: refetchJobs } = useJobs({ status: 'open', limit: 50 });
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  const { data: hiddenTalent, isLoading: talentLoading, isError: talentError, refetch: refetchTalent } = useHiddenTalent(selectedPostingId ?? '');
  const [showNudge, setShowNudge] = useState<{ userId: string; name: string } | null>(null);
  const [nudgeMessage, setNudgeMessage] = useState('');

  const postings = jobsData?.data ?? [];
  const selectedPosting = postings.find((p: any) => p.id === selectedPostingId);

  const sendNudgeMutation = useMutation({
    mutationFn: ({ postingId, userId, message }: { postingId: string; userId: string; message: string }) =>
      jobsApi.sendNudge(postingId, userId, message).then((r) => r.data),
    onSuccess: () => {
      toast.success('Nudge sent successfully');
      setShowNudge(null);
      setNudgeMessage('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to send nudge');
    },
  });

  const handleSendNudge = () => {
    if (!selectedPostingId || !showNudge || !nudgeMessage.trim()) return;
    sendNudgeMutation.mutate({
      postingId: selectedPostingId,
      userId: showNudge.userId,
      message: nudgeMessage.trim(),
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Hidden Talent</h1>
          <p className="text-secondary mt-1">Discover employees who match your open roles</p>
        </div>
      </div>

      <div className="glass-card p-5 space-y-3 animate-slide-up">
        <label className="text-sm font-medium text-secondary">Select Job Posting</label>
        {jobsLoading ? (
          <div className="skeleton h-10 w-full rounded-lg" />
        ) : jobsError ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Failed to load postings</span>
            <Button size="sm" variant="secondary" icon={<RefreshCw className="w-3 h-3" />} onClick={() => refetchJobs()}>Retry</Button>
          </div>
        ) : postings.length === 0 ? (
          <p className="text-sm text-muted">No open job postings available</p>
        ) : (
          <select
            value={selectedPostingId ?? ''}
            onChange={(e) => setSelectedPostingId(e.target.value || null)}
            className="glass-input w-full"
          >
            <option value="">Select a posting...</option>
            {postings.map((p: any) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
      </div>

      {selectedPostingId ? (
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">
              Matches for <span className="gradient-text">{selectedPosting?.title}</span>
            </h2>
          </div>

          {talentLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="skeleton w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-48 rounded" />
                    <div className="skeleton h-3 w-32 rounded" />
                  </div>
                  <div className="skeleton h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : talentError ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 mx-auto mb-3 text-muted" />
              <p className="text-muted mb-4">Failed to load hidden talent</p>
              <Button size="sm" variant="secondary" icon={<RefreshCw className="w-3 h-3" />} onClick={() => refetchTalent()}>Retry</Button>
            </div>
          ) : !hiddenTalent || hiddenTalent.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted" />
              <p className="text-muted">No hidden talent found for this role</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {hiddenTalent.map((t: any) => (
                <div key={t.userId} className="glass-card p-4 flex items-center gap-4 animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-semibold text-brand-600 shrink-0">
                    {t.isAnonymous ? '?' : (t.fullName ? t.fullName.charAt(0).toUpperCase() : '?')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{t.isAnonymous ? 'Anonymous' : t.fullName}</span>
                      {t.hasApplied && <Badge variant="green">Applied</Badge>}
                    </div>
                    <p className="text-sm text-secondary truncate">{t.currentRole} · {t.team}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={t.matchScore >= 80 ? 'green' : t.matchScore >= 60 ? 'blue' : 'yellow'} size="md">
                      {t.matchScore}% match
                    </Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Send className="w-3 h-3" />}
                      onClick={() => { setShowNudge({ userId: t.userId, name: t.isAnonymous ? 'Anonymous' : t.fullName }); setNudgeMessage(''); }}
                    >
                      Nudge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card text-center py-16">
          <Eye className="w-12 h-12 mx-auto mb-3 text-muted" />
          <p className="text-muted">Select a job posting above to see hidden talent matches</p>
        </div>
      )}

      <Modal open={!!showNudge} onClose={() => { setShowNudge(null); setNudgeMessage(''); }} title="Send Nudge" size="sm">
        <p className="text-sm text-secondary mb-4">
          Send a personalized nudge to <strong>{showNudge?.name}</strong> about <strong>{selectedPosting?.title}</strong>.
        </p>
        <textarea
          className="glass-input w-full min-h-[100px] resize-none mb-4"
          placeholder="Write your nudge message..."
          value={nudgeMessage}
          onChange={(e) => setNudgeMessage(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => { setShowNudge(null); setNudgeMessage(''); }}>Cancel</Button>
          <Button
            icon={<Send className="w-4 h-4" />}
            loading={sendNudgeMutation.isPending}
            disabled={!nudgeMessage.trim()}
            onClick={handleSendNudge}
          >
            Send
          </Button>
        </div>
      </Modal>
    </div>
  );
}
