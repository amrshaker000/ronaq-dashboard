import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'] || '3001', 10),
  clientUrl: process.env['CLIENT_URL'] || 'http://localhost:5173',

  supabase: {
    url: process.env['SUPABASE_URL'] || '',
    anonKey: process.env['SUPABASE_ANON_KEY'] || '',
    serviceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY'] || '',
  },

  isProduction: process.env['NODE_ENV'] === 'production',
  isDevelopment: process.env['NODE_ENV'] !== 'production',
} as const;

export function validateEnv(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const;

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
