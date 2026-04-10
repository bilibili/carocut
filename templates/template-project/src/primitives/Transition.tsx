import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Transition - Visual transition effects between shots.
 *
 * Wraps content with entrance/exit animations using clip-path,
 * opacity, and transform-based reveals. For use within individual
 * shots (for TransitionSeries-based transitions between shots,
 * use @remotion/transitions directly).
 *
 * @example
 * // Circle wipe reveal
 * <Transition type="circle-wipe" direction="in">
 *   <MyContent />
 * </Transition>
 *
 * // Horizontal blinds reveal
 * <Transition type="blinds" direction="in" segments={6}>
 *   <MyContent />
 * </Transition>
 *
 * // Zoom and fade in
 * <Transition type="zoom-fade" direction="in">
 *   <MyContent />
 * </Transition>
 */

type TransitionType =
  | "circle-wipe"
  | "diagonal-wipe"
  | "blinds"
  | "zoom-fade"
  | "iris"
  | "curtain"
  | "dissolve-blur";

type TransitionDirection = "in" | "out";

interface TransitionProps {
  /** Transition effect type */
  type: TransitionType;
  /** Direction: "in" = reveal content, "out" = hide content. Default: "in" */
  direction?: TransitionDirection;
  /** Duration of transition in seconds. Default: uses full Sequence duration */
  durationSec?: number;
  /** Delay before transition starts in seconds. Default: 0 */
  delaySec?: number;
  /** Number of segments for blinds effect. Default: 5 */
  segments?: number;
  /** Content to transition */
  children: React.ReactNode;
  /** Container style */
  style?: React.CSSProperties;
  className?: string;
}

export const Transition: React.FC<TransitionProps> = ({
  type,
  direction = "in",
  durationSec,
  delaySec = 0,
  segments = 5,
  children,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);
  const transitionFrames = durationSec
    ? Math.round(durationSec * fps)
    : durationInFrames;

  const adjustedFrame = Math.max(0, frame - delayFrames);
  const rawProgress = interpolate(
    adjustedFrame,
    [0, Math.max(1, transitionFrames)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Reverse for "out" direction
  const progress = direction === "out" ? 1 - rawProgress : rawProgress;

  // Ease in-out
  const eased = progress * progress * (3 - 2 * progress);

  const getStyle = (): React.CSSProperties => {
    switch (type) {
      case "circle-wipe": {
        const radius = eased * 150; // percentage
        return {
          clipPath: `circle(${radius}% at 50% 50%)`,
        };
      }

      case "diagonal-wipe": {
        // Diagonal line sweeping from top-left to bottom-right
        const pos = eased * 200 - 50; // -50 to 150
        return {
          clipPath: `polygon(0 0, ${pos}% 0, ${pos - 50}% 100%, 0 100%)`,
          ...(eased >= 0.99 ? { clipPath: "none" } : {}),
        };
      }

      case "iris": {
        // Diamond/iris opening
        const s = eased * 100;
        return {
          clipPath: `polygon(50% ${50 - s}%, ${50 + s}% 50%, 50% ${50 + s}%, ${50 - s}% 50%)`,
          ...(eased >= 0.99 ? { clipPath: "none" } : {}),
        };
      }

      case "zoom-fade": {
        const scale = interpolate(eased, [0, 1], [1.3, 1]);
        return {
          opacity: eased,
          transform: `scale(${scale})`,
        };
      }

      case "curtain": {
        // Two panels opening from center
        const openAmount = eased * 50;
        return {
          clipPath: `polygon(${50 - openAmount}% 0, ${50 + openAmount}% 0, ${50 + openAmount}% 100%, ${50 - openAmount}% 100%)`,
          ...(eased >= 0.99 ? { clipPath: "none" } : {}),
        };
      }

      case "dissolve-blur": {
        const blur = interpolate(eased, [0, 1], [20, 0]);
        return {
          opacity: eased,
          filter: `blur(${blur}px)`,
        };
      }

      case "blinds": {
        // This uses a repeating gradient mask
        const segmentHeight = 100 / segments;
        const openPercent = eased * segmentHeight;
        const gradientStops = Array.from({ length: segments }, (_, i) => {
          const start = i * segmentHeight;
          return `transparent ${start}%, transparent ${start + openPercent}%, black ${start + openPercent}%, black ${start + segmentHeight}%`;
        }).join(", ");

        return {
          WebkitMaskImage:
            eased >= 0.99
              ? "none"
              : `linear-gradient(to bottom, ${gradientStops})`,
          maskImage:
            eased >= 0.99
              ? "none"
              : `linear-gradient(to bottom, ${gradientStops})`,
        };
      }

      default:
        return { opacity: eased };
    }
  };

  return (
    <AbsoluteFill
      className={className}
      style={{
        ...getStyle(),
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
