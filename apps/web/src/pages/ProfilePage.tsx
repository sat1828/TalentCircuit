import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile, useSkills, useAddSkill, useUpdateSkill, useRemoveSkill } from '../hooks/useProfile';
import { profileApi } from '../lib/api';
import { Modal } from '../components/ui/Modal';
import { Star, Plus, Trash2, Shield, AlertCircle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const SKILL_SUGGESTIONS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'AWS',
  'JavaScript', 'Go', 'Rust', 'Kubernetes', 'GraphQL', 'Redis', 'MongoDB',
  'Product Management', 'Data Analysis', 'Machine Learning', 'UI Design',
  'Communication', 'Leadership', 'Agile/Scrum', 'Mentoring',
];

const PROFICIENCY_LABELS = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];

export function ProfilePage() {
  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile();
  const { data: skills, isLoading: skillsLoading, isError: skillsError } = useSkills();
  const addSkill = useAddSkill();
  const updateSkill = useUpdateSkill();
  const removeSkill = useRemoveSkill();
  const qc = useQueryClient();

  const updateProfile = useMutation({
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

  const validateSkill = useMutation({
    mutationFn: (data: { employeeSkillId: string; proficiencyLevel: number }) =>
      profileApi.validateSkill(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      toast.success('Skill validation requested');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to request validation');
    },
  });

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [aspShort, setAspShort] = useState('');
  const [aspLong, setAspLong] = useState('');
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(3);

  const handleEdit = () => {
    setFullName(profile?.fullName ?? '');
    setAspShort(profile?.aspirationShort ?? '');
    setAspLong(profile?.aspirationLong ?? '');
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        fullName: fullName.trim() || undefined,
        aspirationShort: aspShort || null,
        aspirationLong: aspLong || null,
      });
      setEditing(false);
    } catch { /* toast handled by hook */ }
  };

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    try {
      await addSkill.mutateAsync({ skillName: newSkillName.trim(), proficiencyLevel: newSkillLevel });
      setShowAddSkill(false);
      setNewSkillName('');
      setNewSkillLevel(3);
    } catch { /* toast handled by hook */ }
  };

  if (profileError || skillsError) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-semibold mb-2">Failed to load profile</h2>
          <p className="text-muted mb-4">Something went wrong. Please try again.</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 skeleton rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 skeleton" />
              <div className="h-4 w-32 skeleton" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 skeleton rounded-full w-full" />
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-20 skeleton" />
            <div className="h-8 w-24 skeleton" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <div className="h-4 w-28 skeleton" />
                    <div className="h-3 w-16 skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <div className="floating-orb w-72 h-72 bg-purple-500/20 -top-32 -left-32" style={{ animationDelay: '0s' }} />
      <div className="floating-orb w-96 h-96 bg-brand-500/15 top-1/3 -right-48" style={{ animationDelay: '-4s' }} />
      <div className="floating-orb w-64 h-64 bg-blue-500/15 bottom-0 left-1/4" style={{ animationDelay: '-8s' }} />

      {/* Profile header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="text-2xl font-bold text-white">{profile?.fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">{profile?.fullName || 'User'}</h1>
              <p className="text-sm text-secondary">
                {profile?.currentRoleTitle || 'No role set'}
                {profile?.teamName ? <> &middot; {profile.teamName}</> : ''}
                {profile?.managerName ? <> &middot; Reports to {profile.managerName}</> : ''}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-secondary">
                  {profile?.profileCompleteness ?? 0}% complete
                </span>
                {profile?.role && <span className="badge-blue">{profile.role}</span>}
              </div>
            </div>
          </div>
          {!editing && (
            <button className="btn-secondary btn-sm" onClick={handleEdit}>
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile completeness bar */}
        <div className="mt-4">
          <div className="w-full bg-[rgb(var(--color-surface-alt))] rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-1000 ease-out"
              style={{ width: `${profile?.profileCompleteness ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Edit profile panel */}
      {editing && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Edit Profile</h2>
            <button onClick={() => setEditing(false)} className="p-1 rounded-lg hover:bg-[rgb(var(--color-text)_/_0.05)] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="glass-input"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">1-Year Aspiration</label>
            <textarea
              value={aspShort}
              onChange={(e) => setAspShort(e.target.value)}
              className="glass-input"
              rows={2}
              placeholder="What role do you see yourself in within a year?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Long-Term Aspiration</label>
            <textarea
              value={aspLong}
              onChange={(e) => setAspLong(e.target.value)}
              className="glass-input"
              rows={2}
              placeholder="What is your ultimate career goal?"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Skills section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Skills</h2>
          <button className="btn-primary btn-sm" onClick={() => setShowAddSkill(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Skill
          </button>
        </div>

        {skillsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 glass-card">
                <div className="flex items-center gap-3">
                  <div className="space-y-2">
                    <div className="h-4 w-28 skeleton" />
                    <div className="h-3 w-16 skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : skills?.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted" />
            <p className="text-secondary font-medium">No skills added yet</p>
            <p className="text-muted text-sm mt-1">Add skills to get matched with the right opportunities.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {skills?.map((skill: any) => (
              <div key={skill.id} className="glass-card p-4 flex flex-col gap-3 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{skill.skillName}</p>
                    <span className="badge-blue text-xs mt-1 inline-block">{skill.skillCategory}</span>
                  </div>
                  <button
                    onClick={() => removeSkill.mutate(skill.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Star rating */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => updateSkill.mutate({ skillId: skill.id, proficiencyLevel: i + 1 })}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          i < skill.proficiencyLevel
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-muted'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Validation status & request */}
                <div className="flex items-center justify-between mt-1">
                  {skill.validationStatus === 'manager_validated' ? (
                    <span className="badge-green flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Manager Validated
                    </span>
                  ) : (
                    <>
                      <span className="badge-yellow">Self Reported</span>
                      <button
                        className="btn-secondary btn-sm text-xs"
                        onClick={() =>
                          validateSkill.mutate({
                            employeeSkillId: skill.id,
                            proficiencyLevel: skill.proficiencyLevel,
                          })
                        }
                        disabled={validateSkill.isPending}
                      >
                        {validateSkill.isPending ? 'Requesting...' : 'Request Validation'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add skill modal */}
      <Modal open={showAddSkill} onClose={() => setShowAddSkill(false)} title="Add Skill">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Skill Name</label>
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="glass-input"
              placeholder="e.g., React, Python, Docker"
              list="skill-suggestions"
            />
            <datalist id="skill-suggestions">
              {SKILL_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Proficiency: {PROFICIENCY_LABELS[newSkillLevel]}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={5}
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(parseInt(e.target.value))}
                className="w-full accent-brand-500"
              />
              <span className="text-sm font-semibold text-secondary min-w-[2ch] text-center">
                {newSkillLevel}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>Beginner</span>
              <span>Intermediate</span>
              <span>Expert</span>
            </div>
          </div>
          <button
            className="btn-primary w-full"
            onClick={handleAddSkill}
            disabled={addSkill.isPending || !newSkillName.trim()}
          >
            {addSkill.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1.5" />
                Add to Profile
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* Aspirations */}
      {!editing && (profile?.aspirationShort || profile?.aspirationLong) && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-3">Career Aspirations</h2>
          {profile?.aspirationShort && (
            <div className="mb-3">
              <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-1">1-Year Goal</p>
              <p className="text-sm">{profile.aspirationShort}</p>
            </div>
          )}
          {profile?.aspirationLong && (
            <div>
              <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-1">Long-Term Goal</p>
              <p className="text-sm">{profile.aspirationLong}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
