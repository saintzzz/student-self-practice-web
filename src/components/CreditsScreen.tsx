import { useEffect, useRef, useState } from 'react';
import {
  displayCreator,
  fetchAttribution,
  imageLicenseLabel,
  type AttributionLoadState,
} from '../lib/credits/attribution';

const PILL =
  'rounded-full bg-sky-100 px-6 py-3 text-lg font-bold text-sky-700 transition hover:bg-sky-200 focus:outline-none focus:ring-4 focus:ring-sky-500';
const CARD = 'mb-3 rounded-2xl border-4 border-sky-200 bg-sky-50 p-4';

interface CreditsScreenProps {
  onBack: () => void;
}

/**
 * Credits / attribution surface (design-spec 5.6, AC-7.x). Static text only -
 * no pictures or mascot (0 Lottie players, section 6 table). URLs render as
 * plain text, never anchors (AC-7.5). Focus lands on the h1 on open and
 * returns to the "Nguồn hình ảnh" pill on back (AC-7.10).
 */
export default function CreditsScreen({ onBack }: CreditsScreenProps) {
  const [state, setState] = useState<AttributionLoadState>({ status: 'loading' });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    let cancelled = false;
    fetchAttribution()
      .then((manifest) => {
        if (!cancelled) setState({ status: 'ready', manifest });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-left">
      <button type="button" data-testid="credits-back" onClick={onBack} className={`mb-6 ${PILL}`}>
        ← Quay lại
      </button>
      <h1 ref={headingRef} tabIndex={-1} className="mb-3 text-3xl font-extrabold text-sky-900">
        Nguồn hình ảnh và giấy phép
      </h1>
      <p className="mb-8 text-lg text-sky-700">
        Ứng dụng dùng hình ảnh miễn phí từ các nguồn dưới đây. Cảm ơn các tác giả!
      </p>

      {state.status === 'loading' && (
        <div data-testid="credits-loading">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="mb-3 h-16 animate-pulse rounded-2xl bg-sky-100 motion-reduce:animate-none"
            />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <p
          data-testid="credits-error"
          className="rounded-2xl border-4 border-rose-300 bg-rose-50 p-4 text-base font-semibold text-rose-700"
        >
          Không tải được danh sách nguồn hình ảnh. Vui lòng thử lại sau.
        </p>
      )}

      {state.status === 'ready' && (
        <>
          <section>
            <h2 className="mb-3 text-xl font-bold text-sky-900">Bộ biểu tượng cảm xúc</h2>
            {state.manifest.collections.map((c) => (
              <div key={c.id} className={CARD} data-testid={`credits-collection-${c.id}`}>
                <p className="text-base text-slate-700">
                  {c.title} của {c.author}, giấy phép {c.licenseLabel}
                </p>
                <p className="break-all text-sm text-slate-700">Giấy phép: {c.licenseUrl}</p>
                <p className="break-all text-sm text-slate-700">Nguồn: {c.sourceUrl}</p>
              </div>
            ))}
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-sky-900">Ảnh chụp trong kho ảnh</h2>
            {state.manifest.images.length === 0 ? (
              <p className="text-base text-slate-700">Chưa có ảnh chụp nào trong kho ảnh.</p>
            ) : (
              state.manifest.images.map((img) => (
                <div key={img.wordId} className={CARD} data-testid={`credits-image-${img.wordId}`}>
                  <p className="text-base text-slate-700">
                    Ảnh "{img.title}" của {displayCreator(img)} cho từ "{img.word}", giấy phép{' '}
                    {imageLicenseLabel(img)}, nguồn {img.provider}
                    {img.modified ? ' (đã thay đổi kích thước)' : ''}
                  </p>
                  <p className="break-all text-sm text-slate-700">Giấy phép: {img.licenseUrl}</p>
                  <p className="break-all text-sm text-slate-700">Nguồn: {img.sourceUrl}</p>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
