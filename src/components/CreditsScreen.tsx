import { useEffect, useRef, useState } from 'react';
import {
  displayCreator,
  fetchAttribution,
  imageLicenseLabel,
  type AttributionLoadState,
} from '../lib/credits/attribution';

import { NAV_PILL, H1, H2, SCREEN_ENTER } from '../lib/ui/tokens';

const PILL = NAV_PILL;
const CARD = 'mb-3 rounded-2xl bg-gradient-to-b from-[#162C55] to-[#0E1F42] p-4 shadow-md ring-1 ring-sky-400/30';

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
    <div className={`mx-auto max-w-2xl px-4 py-6 text-left sm:py-10 ${SCREEN_ENTER}`}>
      <button type="button" data-testid="credits-back" onClick={onBack} className={`mb-6 ${PILL}`}>
        ← Quay lại
      </button>
      <h1 ref={headingRef} tabIndex={-1} className={`mb-3 ${H1}`}>
        Nguồn hình ảnh và giấy phép
      </h1>
      <p className="mb-8 text-lg text-amber-200">
        Ứng dụng dùng hình ảnh miễn phí từ các nguồn dưới đây. Cảm ơn các tác giả!
      </p>

      {state.status === 'loading' && (
        <div data-testid="credits-loading">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="mb-3 h-16 animate-pulse rounded-2xl bg-sky-500/20 motion-reduce:animate-none"
            />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <p
          data-testid="credits-error"
          className="rounded-2xl border-4 border-rose-300 bg-rose-500/15 p-4 text-base font-semibold text-rose-300"
        >
          Không tải được danh sách nguồn hình ảnh. Vui lòng thử lại sau.
        </p>
      )}

      {state.status === 'ready' && (
        <>
          <section>
            <h2 className={`mb-3 ${H2}`}>Tài nguyên đồ họa và phông chữ</h2>
            {state.manifest.collections.map((c) => (
              <div key={c.id} className={CARD} data-testid={`credits-collection-${c.id}`}>
                <p className="text-base text-slate-300">
                  {c.title} của {c.author}, giấy phép {c.licenseLabel}
                </p>
                <p className="break-all text-sm text-slate-300">Giấy phép: {c.licenseUrl}</p>
                <p className="break-all text-sm text-slate-300">Nguồn: {c.sourceUrl}</p>
              </div>
            ))}
          </section>

          <section>
            <h2 className={`mb-3 ${H2}`}>Ảnh chụp trong kho ảnh</h2>
            {state.manifest.images.length === 0 ? (
              <p className="text-base text-slate-300">Chưa có ảnh chụp nào trong kho ảnh.</p>
            ) : (
              state.manifest.images.map((img) => (
                <div key={img.wordId} className={CARD} data-testid={`credits-image-${img.wordId}`}>
                  <p className="text-base text-slate-300">
                    Ảnh "{img.title}" của {displayCreator(img)} cho từ "{img.word}", giấy phép{' '}
                    {imageLicenseLabel(img)}, nguồn {img.provider}
                    {img.modified ? ' (đã thay đổi kích thước)' : ''}
                  </p>
                  <p className="break-all text-sm text-slate-300">Giấy phép: {img.licenseUrl}</p>
                  <p className="break-all text-sm text-slate-300">Nguồn: {img.sourceUrl}</p>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
