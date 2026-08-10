/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_DEPLOY_ENV?: 'preview' | 'production';
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
