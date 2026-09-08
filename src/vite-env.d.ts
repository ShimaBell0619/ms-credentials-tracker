/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRANSCRIPT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
