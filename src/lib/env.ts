const required = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const supabaseEnv = () => ({
  url: required("NEXT_PUBLIC_SUPABASE_URL"),
  anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
});

export const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Shared secret for server-to-server calls (e.g. the scheduled expiry job). Unset disables this auth path. */
export const cronSecret = () => process.env.CRON_SECRET || null;
