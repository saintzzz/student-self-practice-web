import { memo } from 'react';
import {
  MASCOT_POSES,
  paletteHex,
  pathToD,
  type MascotPoseName,
  type PoseShape,
} from '../../lib/mascot/poses';

interface MascotStaticPoseProps {
  pose: MascotPoseName;
  /** Rendered box size in px (square). */
  sizePx: number;
}

function ShapeNode({ shape }: { shape: PoseShape }) {
  const fill = shape.fill && shape.fill !== 'none' ? paletteHex(shape.fill) : 'none';
  const stroke = shape.stroke ? paletteHex(shape.stroke) : 'none';
  const common = {
    fill,
    stroke,
    strokeWidth: shape.stroke ? shape.strokeWidth ?? 1 : undefined,
    strokeLinecap: shape.linecap ?? 'butt',
    strokeLinejoin: 'round' as const,
    opacity: shape.opacity,
  };
  if (shape.kind === 'ellipse') {
    return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />;
  }
  return <path d={pathToD(shape)} {...common} />;
}

/**
 * CR-82 (D-08): the static SVG pose - the poster under the Lottie player,
 * the reduced-motion renderer, and the per-pose/session fallback. Draws the
 * exact same `poses.ts` groups the generator emits, so poster -> animation
 * never jumps (spec s9.5 "frame 0 must match the static SVG pose").
 */
export const MascotStaticPose = memo(function MascotStaticPose({ pose, sizePx }: MascotStaticPoseProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={sizePx}
      height={sizePx}
      aria-hidden="true"
      className="block"
      style={{ width: sizePx, height: sizePx }}
    >
      {MASCOT_POSES[pose].groups.map((group) => (
        <g key={group.name} data-pose-group={group.name}>
          {group.shapes.map((shape, i) => (
            <ShapeNode key={i} shape={shape} />
          ))}
        </g>
      ))}
    </svg>
  );
});
