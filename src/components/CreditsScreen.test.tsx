import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreditsScreen from './CreditsScreen';
import type { AttributionManifest } from '../lib/credits/attribution';

const MANIFEST: AttributionManifest = {
  version: 1,
  collections: [
    {
      id: 'twemoji',
      title: 'Twemoji',
      author: 'Twitter, Inc and other contributors',
      license: 'CC-BY-4.0',
      licenseLabel: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      sourceUrl: 'https://github.com/jdecked/twemoji',
      version: '15.1.0',
      paths: ['/emoji/svg/'],
      modified: false,
    },
    {
      id: 'noto-animated-emoji',
      title: 'Noto Emoji Animation',
      author: 'Google',
      license: 'CC-BY-4.0',
      licenseLabel: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      sourceUrl: 'https://googlefonts.github.io/noto-emoji-animation/',
      version: '2026-09-29',
      paths: ['/emoji/lottie/'],
      modified: false,
    },
  ],
  images: [],
};

function stubFetch(impl: (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

beforeEach(() => {
  stubFetch(async (url) => {
    if (url === '/attribution.json') return { ok: true, json: async () => MANIFEST };
    throw new Error(`unexpected url ${url}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CreditsScreen (AC-7.x)', () => {
  it('shows skeletons while loading then the two sections (AC-7.2/7.3)', async () => {
    render(<CreditsScreen onBack={() => {}} />);
    expect(screen.getByTestId('credits-loading')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nguồn hình ảnh và giấy phép');

    await waitFor(() => expect(screen.getByTestId('credits-collection-twemoji')).toBeInTheDocument());
    expect(screen.getByTestId('credits-collection-twemoji')).toHaveTextContent(
      'Twemoji của Twitter, Inc and other contributors, giấy phép CC BY 4.0',
    );
    expect(screen.getByText('Bộ biểu tượng cảm xúc')).toBeInTheDocument();
    expect(screen.getByText('Ảnh chụp trong kho ảnh')).toBeInTheDocument();
  });

  it('shows the empty-photo message when images[] is empty (AC-7.6)', async () => {
    render(<CreditsScreen onBack={() => {}} />);
    await waitFor(() =>
      expect(screen.getByText('Chưa có ảnh chụp nào trong kho ảnh.')).toBeInTheDocument(),
    );
  });

  it('renders photo cards with license labels and plain-text URLs (AC-7.5)', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({
        ...MANIFEST,
        images: [
          {
            wordId: 'tent',
            word: 'tent',
            file: '/images/vocab/tent.webp',
            title: 'Camping tent',
            creator: 'Jane Doe',
            creatorUrl: null,
            license: 'by',
            licenseVersion: '4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
            sourceUrl: 'https://example.org/tent',
            provider: 'flickr',
            openverseId: 'abc',
            modified: true,
            reviewStatus: 'approved',
            reviewedBy: 'curator',
            reviewedAt: '2026-09-29',
          },
        ],
      }),
    }));
    render(<CreditsScreen onBack={() => {}} />);
    const card = await screen.findByTestId('credits-image-tent');
    expect(card).toHaveTextContent('Ảnh "Camping tent" của Jane Doe cho từ "tent", giấy phép CC BY 4.0, nguồn flickr (đã thay đổi kích thước)');
    expect(card.querySelectorAll('a')).toHaveLength(0);
  });

  it('cc0 with unknown creator shows "không rõ tác giả"', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({
        ...MANIFEST,
        images: [
          {
            wordId: 'tent',
            word: 'tent',
            file: '/images/vocab/tent.webp',
            title: 'Tent',
            creator: 'unknown',
            creatorUrl: null,
            license: 'cc0',
            licenseVersion: '1.0',
            licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
            sourceUrl: 'https://example.org/x',
            provider: 'openclipart',
            openverseId: 'abc',
            modified: true,
            reviewStatus: 'approved',
            reviewedBy: 'c',
            reviewedAt: '2026-09-29',
          },
        ],
      }),
    }));
    render(<CreditsScreen onBack={() => {}} />);
    const card = await screen.findByTestId('credits-image-tent');
    expect(card).toHaveTextContent('không rõ tác giả');
    expect(card).toHaveTextContent('CC0 1.0');
  });

  it('fetch failure shows the error message; back button still works (AC-7.7)', async () => {
    stubFetch(async () => ({ ok: false, json: async () => ({}) }));
    const onBack = vi.fn();
    render(<CreditsScreen onBack={onBack} />);
    await waitFor(() => expect(screen.getByTestId('credits-error')).toBeInTheDocument());
    expect(screen.getByTestId('credits-error')).toHaveTextContent('Không tải được danh sách nguồn hình ảnh');
    await userEvent.click(screen.getByTestId('credits-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('moves focus to the h1 on open (AC-7.10)', async () => {
    render(<CreditsScreen onBack={() => {}} />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveFocus(),
    );
  });

  it('renders an extra manifest collection without code change (AC-7.8 data-driven)', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({
        ...MANIFEST,
        collections: [
          ...MANIFEST.collections,
          {
            id: 'test-set',
            title: 'Test Set',
            author: 'Someone',
            license: 'CC0-1.0',
            licenseLabel: 'CC0',
            licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
            sourceUrl: 'https://example.test/test-set',
            version: '1',
            paths: ['/test/'],
            modified: false,
          },
        ],
      }),
    }));

    render(<CreditsScreen onBack={() => {}} />);

    await waitFor(() =>
      expect(screen.getByTestId('credits-collection-test-set')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('credits-collection-test-set')).toHaveTextContent('Test Set');
  });

  it('fetches only the same-origin /attribution.json (C4)', async () => {
    render(<CreditsScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('credits-collection-twemoji')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith('/attribution.json');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
