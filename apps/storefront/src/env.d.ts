/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_DEPLOY_ENV?: 'preview' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
