// KoBoToolbox dataset configuration
// Asset IDs are read from environment variables so they are never committed to git.
// The API token lives ONLY on the proxy server (KOBO_TOKEN env var on Render).
// Local dev: create a .env.local file (see .env.example) — it is gitignored.

export interface KoboDatasetConfig {
  assetId: string;
}

export const KOBO_BASE = 'https://kf.kobotoolbox.org';

export const KOBO_DATASETS: Record<'main' | 'revisit', KoboDatasetConfig> = {
  main:    { assetId: import.meta.env.VITE_MAIN_ASSET_ID    ?? '' },
  revisit: { assetId: import.meta.env.VITE_REVISIT_ASSET_ID ?? '' },
};
