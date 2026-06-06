import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../lib/api';
import toast from 'react-hot-toast';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then((r) => r.data),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => profileApi.update(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('Profile updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update profile');
    },
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: () => profileApi.getSkills().then((r) => r.data),
  });
}

export function useAddSkill() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { skillName: string; proficiencyLevel: number }) =>
      profileApi.addSkill(data.skillName, data.proficiencyLevel).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Skill added');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to add skill');
    },
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { skillId: string; proficiencyLevel: number }) =>
      profileApi.updateSkill(data.skillId, data.proficiencyLevel).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      toast.success('Skill updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update skill');
    },
  });
}

export function useRemoveSkill() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) => profileApi.removeSkill(skillId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Skill removed');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to remove skill');
    },
  });
}
