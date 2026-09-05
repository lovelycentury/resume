/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin in production. Unset in dev — the Vite proxy handles `/be/*`. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}
