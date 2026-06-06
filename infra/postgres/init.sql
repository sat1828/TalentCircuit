-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create ENUM types
CREATE TYPE skill_category AS ENUM ('technical', 'soft', 'domain', 'tool');
CREATE TYPE validation_status AS ENUM ('self_reported', 'manager_validated', 'certification_verified');
CREATE TYPE role_level AS ENUM ('junior', 'mid', 'senior', 'lead', 'manager', 'director');
CREATE TYPE posting_status AS ENUM ('draft', 'open', 'closed', 'filled');
CREATE TYPE posting_type AS ENUM ('full_transfer', 'gig', 'shadowing');
CREATE TYPE application_status AS ENUM ('interested', 'applied', 'reviewing', 'interview', 'offered', 'rejected', 'withdrawn');
CREATE TYPE notification_type AS ENUM ('new_match', 'application_update', 'hidden_talent_alert', 'digest', 'validation_request');
CREATE TYPE user_role AS ENUM ('employee', 'manager', 'hr_admin', 'super_admin');
CREATE TYPE company_plan AS ENUM ('starter', 'growth', 'enterprise');

-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL UNIQUE,
  plan company_plan NOT NULL DEFAULT 'growth',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_teams_company ON teams(company_id);

-- Roles (position taxonomy)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  level role_level NOT NULL,
  department VARCHAR(255),
  description TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_roles_company ON roles(company_id);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  current_role_id UUID REFERENCES roles(id),
  team_id UUID REFERENCES teams(id),
  manager_id UUID REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  profile_completeness INT NOT NULL DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  profile_vector vector(1536),
  aspiration_short TEXT,
  aspiration_long TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_manager ON users(manager_id);
CREATE INDEX idx_users_profile_vector ON users USING ivfflat (profile_vector vector_cosine_ops);

-- Skills taxonomy
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  category skill_category NOT NULL,
  parent_skill_id UUID REFERENCES skills(id),
  description TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_skills_parent ON skills(parent_skill_id);
CREATE INDEX idx_skills_embedding ON skills USING ivfflat (embedding vector_cosine_ops);

-- Employee skills junction
CREATE TABLE employee_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level INT NOT NULL CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  validation_status validation_status NOT NULL DEFAULT 'self_reported',
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  source VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);
CREATE INDEX idx_employee_skills_user ON employee_skills(user_id);
CREATE INDEX idx_employee_skills_skill ON employee_skills(skill_id);

-- Role-skill requirements
CREATE TABLE role_skill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required_proficiency INT NOT NULL CHECK (required_proficiency >= 1 AND required_proficiency <= 5),
  is_required BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(role_id, skill_id)
);
CREATE INDEX idx_role_skill_requirements_role ON role_skill_requirements(role_id);

-- Job postings
CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  posted_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status posting_status NOT NULL DEFAULT 'draft',
  posting_type posting_type NOT NULL DEFAULT 'full_transfer',
  is_anonymous_apply BOOLEAN NOT NULL DEFAULT true,
  application_deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_postings_company ON job_postings(company_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);

-- Applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'interested',
  match_score FLOAT,
  gap_analysis JSONB,
  current_manager_notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(posting_id, applicant_id)
);
CREATE INDEX idx_applications_posting ON applications(posting_id);
CREATE INDEX idx_applications_applicant ON applications(applicant_id);

-- Skill gap analyses (cached)
CREATE TABLE skill_gap_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  match_score FLOAT NOT NULL,
  strengths JSONB NOT NULL DEFAULT '[]',
  gaps JSONB NOT NULL DEFAULT '[]',
  learning_plan JSONB NOT NULL DEFAULT '[]',
  assessment TEXT,
  generated_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, posting_id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  payload JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- Job interests (anonymous signal, before formal application)
CREATE TABLE job_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(posting_id, user_id)
);
CREATE INDEX idx_job_interests_posting ON job_interests(posting_id);

-- Email digests log
CREATE TABLE digest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  digest_data JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_digest_log_user_week ON digest_log(user_id, sent_at);

-- Insert pgvector compatibility function
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS FLOAT AS $$
  SELECT 1 - (a <=> b);
$$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE;
