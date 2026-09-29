/**
 * Attribution data layer (PRD 9.2, AC-7.8): the Credits screen reads only
 * `/attribution.json`, same-origin, at runtime - no compile-time copy.
 */

export interface AttributionCollection {
  id: string;
  title: string;
  author: string;
  license: string;
  licenseLabel: string;
  licenseUrl: string;
  sourceUrl: string;
  version: string;
  paths: string[];
  modified: boolean;
}

export interface AttributionImage {
  wordId: string;
  word: string;
  file: string;
  title: string;
  /** Sanitized creator, or 'unknown' only when license is cc0. */
  creator: string;
  creatorUrl: string | null;
  license: 'cc0' | 'by';
  licenseVersion: string;
  licenseUrl: string;
  sourceUrl: string;
  provider: string;
  openverseId: string;
  modified: boolean;
  reviewStatus: 'approved';
  reviewedBy: string;
  reviewedAt: string;
}

export interface AttributionManifest {
  version: 1;
  collections: AttributionCollection[];
  images: AttributionImage[];
}

export type AttributionLoadState =
  | { status: 'loading' }
  | { status: 'ready'; manifest: AttributionManifest }
  | { status: 'error' };

/** Per PRD 6.x label mapping: cc0 -> "CC0 1.0"; by + version -> "CC BY {v}". */
export function imageLicenseLabel(image: Pick<AttributionImage, 'license' | 'licenseVersion'>): string {
  if (image.license === 'cc0') {
    return 'CC0 1.0';
  }
  return `CC BY ${image.licenseVersion}`.trim();
}

export function displayCreator(image: AttributionImage): string {
  return image.license === 'cc0' && (!image.creator || image.creator === 'unknown')
    ? 'không rõ tác giả'
    : image.creator;
}

export async function fetchAttribution(): Promise<AttributionManifest> {
  const base = import.meta.env.BASE_URL ?? '/';
  const url = `${base}attribution.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`attribution fetch: HTTP ${res.status}`);
  }
  return (await res.json()) as AttributionManifest;
}
