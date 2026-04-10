import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * MaskReveal - Clip-path and mask-based reveal animations.
 *
 * Reveals content using geometric mask shapes that animate open.
 *
 * @example
 * // Circle expanding from center
 * <MaskReveal shape="circle">
 *   <Img src={staticFile("hero.png")} />
 * </MaskReveal>
 *
 * // Horizontal wipe from left
 * <MaskReveal shape="wipe-left">
 *   <MyContent />
 * </MaskReveal>
 *
 * // Rectangle expanding from center
 * <MaskReveal shape="rectangle" borderRadius={20}>
 *   <MyContent />
 * </MaskReveal>
 */

type MaskShape =
  | "circle"
  | "ellipse"
  | "rectangle"
  | "diamond"
  | "wipe-left"
  | "wipe-right"
  | "wipe-up"
  | "wipe-down"
  | "split-horizontal"
  | "split-vertical";

interface MaskRevealProps {
  /** Mask shape. Default: "circle" */
  shape?: MaskShape;
  /** Reveal direction: "in" = reveal, "out" = hide. Default: "in" */
  direction?: "in" | "out";
  /** Delay in seconds. Default: 0 */
  delaySec?: number;
  /** Duration of the reveal in seconds. Defaults to Sequence duration. */
  durationSec?: number;
  /** Origin point for circle/ellipse/rectangle [x%, y%]. Default: [50, 50] */
  origin?: [number, number];
  /** Border radius for rectangle shape. Default: 0 */
  borderRadius?: number;
  /** Content to reveal */
  children: React.ReactNode;
  /** Container style */
  style?: React.CSSProperties;
  className?: string;
}

export const MaskReveal: React.FC<MaskRevealProps> = ({
  shape = "circle",
  direction = "in",
  delaySec = 0,
  durationSec,
  origin = [50, 50],
  borderRadius = 0,
  children,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);
  const animFrames = durationSec
    ? Math.round(durationSec * fps)
    : durationInFrames;

  const adjustedFrame = Math.max(0, frame - delayFrames);
  const rawProgress = interpolate(
    adjustedFrame,
    [0, Math.max(1, animFrames)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const progress = direction === "out" ? 1 - rawProgress : rawProgress;

  // Ease in-out
  const p = progress * progress * (3 - 2 * progress);

  const getClipPath = (): string => {
    const [ox, oy] = origin;

    switch (shape) {
      case "circle":
        return `circle(${p * 150}% at ${ox}% ${oy}%)`;

      case "ellipse":
        return `ellipse(${p * 150}% ${p * 100}% at ${ox}% ${oy}%)`;

      case "rectangle": {
        const hw = p * 50; // half-width percentage
        const hh = p * 50;
        if (borderRadius > 0) {
          // inset with border radius
          const insetH = 50 - hw;
          const insetV = 50 - hh;
          return `inset(${insetV}% ${insetH}% ${insetV}% ${insetH}% round ${borderRadius}px)`;
        }
        return `inset(${50 - hh}% ${50 - hw}% ${50 - hh}% ${50 - hw}%)`;
      }

      case "diamond": {
        const s = p * 70; // extent
        return `polygon(${ox}% ${oy - s}%, ${ox + s}% ${oy}%, ${ox}% ${oy + s}%, ${ox - s}% ${oy}%)`;
      }

      case "wipe-left":
        return `inset(0 ${(1 - p) * 100}% 0 0)`;

      case "wipe-right":
        return `inset(0 0 0 ${(1 - p) * 100}%)`;

      case "wipe-up":
        return `inset(0 0 ${(1 - p) * 100}% 0)`;

      case "wipe-down":
        return `inset(${(1 - p) * 100}% 0 0 0)`;

      case "split-horizontal": {
        const half = (1 - p) * 50;
        return `inset(${half}% 0 ${half}% 0)`;
      }

      case "split-vertical": {
        const half = (1 - p) * 50;
        return `inset(0 ${half}% 0 ${half}%)`;
      }

      default:
        return `circle(${p * 150}% at 50% 50%)`;
    }
  };

  return (
    <AbsoluteFill
      className={className}
      style={{
        clipPath: p >= 0.99 ? "none" : getClipPath(),
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
