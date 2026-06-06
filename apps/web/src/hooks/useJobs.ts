import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '../lib/api';
import toast from 'react-hot-toast';

export function useJobs(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => jobsApi.list(params).then((r) => r.data),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => jobsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job posting created');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create posting');
    },
  });
}

export function useApply() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => jobsApi.apply(jobId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Application submitted');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to apply');
    },
  });
}

export function useExpressInterest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => jobsApi.expressInterest(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Interest registered');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to register interest');
    },
  });
}

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: () => jobsApi.getApplications().then((r) => r.data),
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { postingId: string; applicantId: string; status: string }) =>
      jobsApi.updateApplicationStatus(data.postingId, data.applicantId, data.status).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Application status updated');
    },
  });
}

export function useHiddenTalent(postingId: string) {
  return useQuery({
    queryKey: ['hidden-talent', postingId],
    queryFn: () => jobsApi.getHiddenTalent(postingId).then((r) => r.data),
    enabled: !!postingId,
  });
}
