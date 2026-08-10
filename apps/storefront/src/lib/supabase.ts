import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

function configuredSupabasePublicValues() {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'Missing explicit PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'https:' || url.origin !== supabaseUrl) {
    throw new Error('PUBLIC_SUPABASE_URL must be an exact HTTPS origin.');
  }
  if (!publishableKey.startsWith('sb_publishable_')) {
    throw new Error('PUBLIC_SUPABASE_PUBLISHABLE_KEY must be publishable.');
  }
  return { publishableKey, supabaseUrl };
}

const config = configuredSupabasePublicValues();

export const supabase = createClient<Database>(
  config.supabaseUrl,
  config.publishableKey,
  {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
      persistSession: true,
    },
  },
);
