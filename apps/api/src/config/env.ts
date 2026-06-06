import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '3001'), 10),
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:5173'),

  // Database
  DATABASE_URL: required('DATABASE_URL'),

  // Redis
  REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),

  // JWT
  JWT_SECRET: required('JWT_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_EXPIRY: optional('JWT_EXPIRY', '15m'),
  JWT_REFRESH_EXPIRY: optional('JWT_REFRESH_EXPIRY', '7d'),

  // Anthropic
  ANTHROPIC_API_KEY: optional('ANTHROPIC_API_KEY', ''),
  CLAUDE_MODEL: optional('CLAUDE_MODEL', 'claude-sonnet-4-20250514'),

  // OpenAI (embeddings)
  OPENAI_API_KEY: optional('OPENAI_API_KEY', ''),
  EMBEDDING_MODEL: optional('EMBEDDING_MODEL', 'text-embedding-3-small'),

  // SMTP
  SMTP_HOST: optional('SMTP_HOST', ''),
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587'), 10),
  SMTP_USER: optional('SMTP_USER', ''),
  SMTP_PASS: optional('SMTP_PASS', ''),
  DIGEST_FROM: optional('DIGEST_FROM', 'noreply@talentcircuit.com'),

  // Company
  COMPANY_NAME: optional('COMPANY_NAME', 'TalentCircuit Demo'),
  COMPANY_DOMAIN: optional('COMPANY_DOMAIN', 'talentcircuit-demo.com'),
};

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
