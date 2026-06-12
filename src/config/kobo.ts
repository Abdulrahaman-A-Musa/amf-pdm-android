
export interface KoboDatasetConfig {
  assetId: string;
}

export const KOBO_BASE = 'https://kf.kobotoolbox.org';

export const KOBO_DATASETS: Record<'main' | 'revisit', KoboDatasetConfig> = {
  main:    { assetId: import.meta.env.VITE_MAIN_ASSET_ID    || 'a6bo5hrHXR9h7tfUrNpek5' },
  revisit: { assetId: import.meta.env.VITE_REVISIT_ASSET_ID || 'akopQ5AK6WRkxHE7hSNGbV' },
};
