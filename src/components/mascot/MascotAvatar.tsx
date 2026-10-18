/**
 * MascotAvatar - the bespoke Bé Heo portrait (ChatGPT-generated art)
 * for chrome/logo slots: grade-select medallion, hub hero, exam brand,
 * auth hero. These slots showed the flat PigFace pose; the generated
 * portrait carries the soft-3D product identity.
 *
 * The portrait is a centered composition on white - a circular
 * object-cover crop frames head + shoulders like a photo in a locket.
 * Animated/feedback moods still use the Lottie rig (<Mascot>).
 */
export function MascotAvatar({ sizePx = 72 }: { sizePx?: number }) {
  return (
    <span
      data-testid="mascot"
      data-mascot-mood="greeting"
      data-mascot-renderer="art"
      role="img"
      aria-label="Heo con vẫy chào"
      className="relative inline-flex items-center leading-none"
    >
      <img
        src="/images/mascot/be-heo-portrait.webp"
        alt=""
        aria-hidden="true"
        width={sizePx}
        height={sizePx}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="select-none rounded-full object-cover object-top"
        style={{ width: sizePx, height: sizePx }}
      />
    </span>
  );
}
