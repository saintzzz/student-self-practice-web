import type { SVGProps } from 'react';

/**
 * CR-72: the app's SVG icon set for UI chrome. One consistent language:
 * 24px grid, 2px rounded strokes, slightly chunky geometry so icons stay
 * friendly at small sizes and read identically on every platform (the
 * old raw emoji chrome rendered per-OS - ugly on Windows/Android).
 *
 * Content imagery (vocabulary pictures, question options) still uses
 * EmojiVisual/Twemoji - that is pedagogy, not chrome.
 */
export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

function iconProps({ size = '1em', ...rest }: IconProps): SVGProps<SVGSVGElement> {
  return {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...rest,
  };
}

export function IconStar(props: IconProps) {
  return (
    <svg {...iconProps(props)} fill="currentColor" stroke="none">
      <path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3-5.7-3.1-5.7 3.1 1.2-6.3L2.8 9.3l6.4-.8z" />
    </svg>
  );
}

export function IconFlame(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 22c4.4 0 7-2.8 7-6.5 0-3.2-2-5.2-3.4-7.2-.9-1.3-2-2.7-2.1-4.8-2.5 1.2-4 3.3-4.4 5.9-.6-.8-1-1.6-1.1-2.7C6.4 8.3 5 10.5 5 13.5 5 19.2 7.6 22 12 22z" />
      <path d="M12 18.5c-1.5 0-2.5-1.2-2.5-2.7 0-1.3.8-2.1 1.5-3.1.4-.6.8-1.1 1-1.9 1 .9 2.5 2.4 2.5 4.1 0 1.9-1 3.6-2.5 3.6z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMedal(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="15" r="6" />
      <path d="M8.5 9.5L5 3h5l2 4.5L14 3h5l-3.5 6.5" />
      <path d="M12 12.5l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3.5 10.5L12 3l8.5 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

export function IconFamily(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="8.5" cy="6.5" r="2.8" />
      <path d="M3.5 20c0-3.6 2.2-6 5-6s5 2.4 5 6" />
      <circle cx="16.5" cy="9" r="2.2" />
      <path d="M13.5 20c.2-2.9 1.5-4.8 3-4.8s3 1.9 3.2 4.8" />
    </svg>
  );
}

export function IconCompass(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 6.5C10.5 5 8.5 4.5 5.5 4.5H4v14h5.5c2.3 0 3 .5 4 1 .5-.5 1.7-1 4-1H20v-14h-1.5c-3 0-5 .5-6.5 2z" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 018 0v2.7" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M5 17.5l4.5-4.5 3 3 3.5-3.5 4 4" />
    </svg>
  );
}

export function IconSparkles(props: IconProps) {
  return (
    <svg {...iconProps(props)} fill="currentColor" stroke="none">
      <path d="M11 3.5l1.4 3.9 3.9 1.4-3.9 1.4L11 14.2l-1.4-3.9-3.9-1.4 3.9-1.4z" />
      <path d="M18 13l.9 2.4 2.4.9-2.4.9L18 19.6l-.9-2.4-2.4-.9 2.4-.9z" />
      <path d="M5.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );
}

export function IconParty(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 20L10 8.5 14.5 14z" />
      <path d="M7.5 13.5c1.8 1.3 3.6 1.5 5 .8" />
      <path d="M14 6c.6-1.6 2-2.6 3.7-2.4" />
      <path d="M17.5 8.5c1.7-.3 3 .3 3.6 1.7" />
      <path d="M19.5 4.5l.6-1.4" />
      <circle cx="16" cy="12.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="20" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSwords(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 4l9.5 9.5" />
      <path d="M4 4v3.5L7.5 9" />
      <path d="M12.2 15l-2.7 2.7a2 2 0 003 2.6l2.4-2.4" />
      <path d="M20 4l-9.5 9.5" />
      <path d="M20 4v3.5L16.5 9" />
      <path d="M11.8 15l2.7 2.7a2 2 0 01-3 2.6l-2.4-2.4" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 20l1.2-4.4L16.4 4.4a2.1 2.1 0 013 0l.2.2a2.1 2.1 0 010 3L8.4 18.8z" />
      <path d="M14.5 6.3l3.2 3.2" />
    </svg>
  );
}

export function IconNote(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 3.5h9L19 7.5V20.5H6z" />
      <path d="M14.5 3.5v4.5H19" />
      <path d="M9 12h7M9 15.5h5" />
    </svg>
  );
}

export function IconMic(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0013 0" />
      <path d="M12 18v3.5" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...iconProps(props)} fill="currentColor" stroke="none">
      <path d="M8 5.4v13.2c0 .9 1 1.5 1.8 1L20 13a1.2 1.2 0 000-2l-10.2-6.6c-.8-.5-1.8.1-1.8 1z" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4.5 12.5l5 5L19.5 7" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** CR-73: directional set - replaces all unicode arrow chrome
 *  (←/→/◀/▶/▲/▼) with the SVG family. */
export function IconArrowRight(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M14.5 5.5L8 12l6.5 6.5" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9.5 5.5L16 12l-6.5 6.5" />
    </svg>
  );
}

export function IconChevronUp(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5.5 14.5L12 8l6.5 6.5" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5.5 9.5L12 16l6.5-6.5" />
    </svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <svg {...iconProps(props)} fill="currentColor" stroke="none">
      <path d="M12 20.5C6.5 16.7 3 13.4 3 9.6 3 6.9 5 5 7.5 5c1.8 0 3.4 1 4.5 2.6C13.1 6 14.7 5 16.5 5 19 5 21 6.9 21 9.6c0 3.8-3.5 7.1-9 10.9z" />
    </svg>
  );
}

export function IconSpeaker(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" fill="currentColor" stroke="none" />
      <path d="M16 9a4.5 4.5 0 010 6" />
      <path d="M18.5 6.5a8.2 8.2 0 010 11" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M19.5 12a7.5 7.5 0 11-2.2-5.3" />
      <path d="M19.5 3.5v3.7h-3.7" />
    </svg>
  );
}

export function IconTrophy(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M8 4h8v5.5a4 4 0 01-8 0z" />
      <path d="M8 5.5H4.5a3.5 3.5 0 003.7 3.5M16 5.5h3.5a3.5 3.5 0 01-3.7 3.5" />
      <path d="M12 13.5V16" />
      <path d="M8.5 20h7l-.7-3h-5.6z" />
    </svg>
  );
}

export function IconFlag(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5.5 21V4" />
      <path d="M5.5 5c4-2.2 8 2.2 12 0v8.5c-4 2.2-8-2.2-12 0" />
    </svg>
  );
}

export function IconHash(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9.5 4L7.5 20M16.5 4l-2 16" />
      <path d="M4.5 9h15M4 15h15" />
    </svg>
  );
}

export function IconFlask(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M10 3.5h4M10.8 3.5V9l-5 8.5A2.4 2.4 0 007.9 21h8.2a2.4 2.4 0 002.1-3.5l-5-8.5V3.5" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

export function IconMuscle(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 13.5c0-1.8.9-3.4 2.4-4.2C5.4 8.5 5 7.6 5 6.5 5 4.6 6.6 3 8.5 3c1.6 0 2.9 1 3.3 2.5" />
      <path d="M8.5 13.5C8.5 10 11 8 14 8c3.3 0 6 2.7 6 6.5 0 3.6-3 6.5-8.5 6.5-3.9 0-6-2.5-5.8-5.1" />
      <path d="M12.5 11.5c1.8 0 3.5 1 3.5 3 0 2.2-1.7 3-3.5 3" />
    </svg>
  );
}

export function IconHandshake(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3.5 8.5L7 6l5 3 5-3 3.5 2.5" />
      <path d="M3.5 8.5v6l4.8 4.3a1.8 1.8 0 002.6-.2l-.8-.9a1.6 1.6 0 01.2-2.3l1.7 2a1.6 1.6 0 002.4-.1l-.8-1a1.6 1.6 0 012-2.3l1.2 1.4a1.6 1.6 0 002.4-.2l1.5-1.7v-6" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.7 2.7L16 9.5" />
    </svg>
  );
}

export function IconGift(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="4" y="10" width="16" height="10.5" rx="1.5" />
      <path d="M4 7h16v3H4z" />
      <path d="M12 7v13.5" />
      <path d="M12 7C9.5 7 8 5.8 8 4.2 8 2.9 9 2 10.2 2c1.7 0 1.8 2.4 1.8 5zm0 0c2.5 0 4-1.2 4-2.8C16 2.9 15 2 13.8 2 12.1 2 12 4.4 12 7z" />
    </svg>
  );
}

/** CR-82: treasure chest - replaces the 🎁 emoji in ChestReveal. Lid +
 *  box + lock plate on the 24px grid, 2px round strokes. */
export function IconChest(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 11.5a8 8 0 0116 0v1.5H4z" />
      <path d="M4 13h16v6a1.8 1.8 0 01-1.8 1.8H5.8A1.8 1.8 0 014 19z" />
      <path d="M10.6 13v-1.8h2.8V13" />
      <rect x="10.4" y="14.8" width="3.2" height="3.6" rx="0.8" />
      <path d="M4 16.6h6.4M13.6 16.6H20" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.4 2" />
    </svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 20h16" />
      <path d="M6.5 20v-7M12 20V9M17.5 20V5" />
    </svg>
  );
}

export function IconTrendingUp(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3.5 16.5l5.5-5.5 3.5 3.5 7.5-7.5" />
      <path d="M15.5 7h4.5v4.5" />
    </svg>
  );
}

export function IconBulb(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3a6.5 6.5 0 00-3.7 11.8c.8.7 1.2 1.4 1.2 2.2h5c0-.8.4-1.5 1.2-2.2A6.5 6.5 0 0012 3z" />
      <path d="M9.5 20.5h5" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7.5l8 6 8-6" />
    </svg>
  );
}

export function IconPaw(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 12c-3 0-5.5 2.4-5.5 5 0 1.7 1.2 3 3 3 1 0 1.7-.4 2.5-.4s1.5.4 2.5.4c1.8 0 3-1.3 3-3 0-2.6-2.5-5-5.5-5z" />
      <circle cx="6.5" cy="8" r="1.7" />
      <circle cx="10" cy="5.5" r="1.7" />
      <circle cx="14" cy="5.5" r="1.7" />
      <circle cx="17.5" cy="8" r="1.7" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 4l16 16" />
      <path d="M9.9 6.2A9.4 9.4 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-3 3.7M14.6 17.9a9.6 9.6 0 01-2.6.6c-6 0-9.5-6.5-9.5-6.5a17.5 17.5 0 013.5-4.1" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
    </svg>
  );
}

export function IconStop(props: IconProps) {
  return (
    <svg {...iconProps(props)} fill="currentColor" stroke="none">
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.2" />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7a2.5 2.5 0 01-2.5 2.5H9l-4 4v-13.5z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </svg>
  );
}

export function IconCrown(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 18h16M4 18L3 7.5l5 3.5L12 5l4 6 5-3.5L20 18" />
    </svg>
  );
}

export function IconSchool(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 9.5L12 4l9 5.5-9 5.5z" />
      <path d="M7 11.5V17c0 1.5 2.2 3 5 3s5-1.5 5-3v-5.5" />
      <path d="M20.5 10v5" />
    </svg>
  );
}
