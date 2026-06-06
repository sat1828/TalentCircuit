// ──────────────────────────────────────────
// ENUMS
// ──────────────────────────────────────────

export enum SkillCategory {
  Technical = 'technical',
  Soft = 'soft',
  Domain = 'domain',
  Tool = 'tool',
}

export enum ValidationStatus {
  SelfReported = 'self_reported',
  ManagerValidated = 'manager_validated',
  CertificationVerified = 'certification_verified',
}

export enum RoleLevel {
  Junior = 'junior',
  Mid = 'mid',
  Senior = 'senior',
  Lead = 'lead',
  Manager = 'manager',
  Director = 'director',
}

export enum PostingStatus {
  Draft = 'draft',
  Open = 'open',
  Closed = 'closed',
  Filled = 'filled',
}

export enum PostingType {
  FullTransfer = 'full_transfer',
  Gig = 'gig',
  Shadowing = 'shadowing',
}

export enum ApplicationStatus {
  Interested = 'interested',
  Applied = 'applied',
  Reviewing = 'reviewing',
  Interview = 'interview',
  Offered = 'offered',
  Rejected = 'rejected',
  Withdrawn = 'withdrawn',
}

export enum NotificationType {
  NewMatch = 'new_match',
  ApplicationUpdate = 'application_update',
  HiddenTalentAlert = 'hidden_talent_alert',
  Digest = 'digest',
  ValidationRequest = 'validation_request',
}

export enum UserRole {
  Employee = 'employee',
  Manager = 'manager',
  HrAdmin = 'hr_admin',
  SuperAdmin = 'super_admin',
}

export enum CompanyPlan {
  Starter = 'starter',
  Growth = 'growth',
  Enterprise = 'enterprise',
}

// ──────────────────────────────────────────
// CORE ENTITIES
// ──────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  domain: string;
  plan: CompanyPlan;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface Role {
  id: string;
  companyId: string;
  title: string;
  level: RoleLevel;
  department: string | null;
  description: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: UserRole;
  currentRoleId: string | null;
  teamId: string | null;
  managerId: string | null;
  isActive: boolean;
  profileCompleteness: number;
  aspirationShort: string | null;
  aspirationLong: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  parentSkillId: string | null;
  description: string | null;
  createdAt: string;
}

export interface EmployeeSkill {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  skillCategory: SkillCategory;
  proficiencyLevel: number;
  validationStatus: ValidationStatus;
  validatedBy: string | null;
  validatedAt: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoleSkillRequirement {
  id: string;
  roleId: string;
  skillId: string;
  skillName: string;
  requiredProficiency: number;
  isRequired: boolean;
}

export interface JobPosting {
  id: string;
  companyId: string;
  roleId: string;
  roleTitle: string;
  postedBy: string;
  postedByName: string;
  title: string;
  description: string | null;
  status: PostingStatus;
  postingType: PostingType;
  isAnonymousApply: boolean;
  applicationDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  matchScore?: number;
  requiredSkillCount?: number;
  applicantCount?: number;
}

export interface Application {
  id: string;
  postingId: string;
  applicantId: string;
  applicantName: string;
  status: ApplicationStatus;
  matchScore: number | null;
  gapAnalysis: GapAnalysisResult | null;
  currentManagerNotified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobInterest {
  id: string;
  postingId: string;
  userId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ──────────────────────────────────────────
// AI / MATCHING TYPES
// ──────────────────────────────────────────

export interface GapAnalysisResult {
  matchScore: number;
  breakdown: SkillCategoryBreakdown[];
  strengths: SkillGapItem[];
  gaps: SkillGapItem[];
  learningPlan: LearningPlanMilestone[];
  assessment: string;
}

export interface SkillCategoryBreakdown {
  category: SkillCategory;
  score: number;
  maxScore: number;
}

export interface SkillGapItem {
  skillName: string;
  currentProficiency: number;
  requiredProficiency: number;
  gap: number;
}

export interface LearningPlanMilestone {
  skillName: string;
  milestone: string;
  timeframe: string;
  resources: LearningResource[];
}

export interface LearningResource {
  title: string;
  type: 'course' | 'book' | 'project' | 'article' | 'mentorship';
  url?: string;
  description: string;
}

export interface CareerPathNode {
  roleId: string;
  title: string;
  level: RoleLevel;
  department: string | null;
  matchScore: number;
  timeHorizon: '1year' | '2year' | '3year';
  skillGaps: SkillGapItem[];
}

export interface CareerPathData {
  currentRole: {
    id: string;
    title: string;
    level: RoleLevel;
  };
  oneYear: CareerPathNode[];
  twoYear: CareerPathNode[];
  threeYear: CareerPathNode[];
}

export interface HiddenTalentResult {
  userId: string;
  fullName: string;
  matchScore: number;
  currentRole: string;
  team: string;
  topMatchingSkills: string[];
  topGapSkills: string[];
}

export interface WeeklyDigestData {
  user: { id: string; fullName: string };
  topMatches: DigestMatch[];
  stretchRole: DigestMatch | null;
  personalizedNote: string;
  weekOf: string;
}

export interface DigestMatch {
  postingId: string;
  title: string;
  team: string;
  matchScore: number;
  description: string;
}

// ──────────────────────────────────────────
// API PAYLOADS
// ──────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  companyDomain: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  aspirationShort?: string | null;
  aspirationLong?: string | null;
  avatarUrl?: string | null;
}

export interface AddSkillRequest {
  skillName: string;
  proficiencyLevel: number;
}

export interface UpdateSkillRequest {
  proficiencyLevel?: number;
}

export interface CreateJobPostingRequest {
  roleId: string;
  title: string;
  description?: string;
  postingType: PostingType;
  isAnonymousApply?: boolean;
  applicationDeadline?: string;
}

export interface ManagerValidationRequest {
  employeeSkillId: string;
  proficiencyLevel: number;
  status: ValidationStatus;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MetricsResponse {
  totalEmployees: number;
  openRoles: number;
  internalApplicants: number;
  averageMatchScore: number;
  mobilityRate: number;
  departmentBreakdown: DepartmentMetric[];
  monthlyTrend: MonthlyTrend[];
}

export interface DepartmentMetric {
  department: string;
  employees: number;
  openRoles: number;
  applications: number;
}

export interface MonthlyTrend {
  month: string;
  internalFills: number;
  externalFills: number;
  mobilityRate: number;
}
