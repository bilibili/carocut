import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * CinematicBackdrop - Minimal breathing background for chapter pauses.
 *
 * This primitive gives pause shots and chapter resets a restrained base layer:
 * a soft fade, an optional pulsing glow, and a subtle vignette. It is intended
 * to sit behind text, symbols, or other sparse transition content.
 *
 * @example
 * <CinematicBackdrop />
 *
 * @example
 * <CinematicBackdrop
 *   baseColor="#020617"
 *   glowColor="#38bdf8"
 *   fadeInSec={0.4}
 *   fadeOutSec={0.8}
 * >
 *   <MyChapterTitle />
 * </CinematicBackdrop>
 */
interface CinematicBackdropProps {
  /** Base background color. */
  baseColor?: string;
  /** Color used for the center glow. */
  glowColor?: string;
  /** Enables the pulsing center glow. */
  glow?: boolean;
  /** Maximum opacity applied to the glow layer. */
  glowStrength?: number;
  /** Fade-in duration in seconds. */
  fadeInSec?: number;
  /** Fade-out duration in seconds. */
  fadeOutSec?: number;
  /** Vignette opacity around the frame edges. */
  vignette?: number;
  /** Optional content layered above the backdrop. */
  children?: React.ReactNode;
  /** Inline style for the outer wrapper. */
  style?: React.CSSProperties;
  className?: string;
}

export const CinematicBackdrop: React.FC<CinematicBackdropProps> = ({
  baseColor = "#020617",
  glowColor = "#38bdf8",
  glow = true,
  glowStrength = 0.28,
  fadeInSec = 0.6,
  fadeOutSec = 0.6,
  vignette = 0.24,
  children,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeInFrames = Math.max(1, Math.round(fadeInSec * fps));
  const fadeOutFrames = Math.max(1, Math.round(fadeOutSec * fps));
  const fadeOutStart = Math.max(0, durationInFrames - fadeOutFrames);

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const pulse = glow
    ? interpolate(Math.sin((frame / fps) * 1.5), [-1, 1], [0.45, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill
      className={className}
      style={{
        backgroundColor: baseColor,
        opacity,
        ...style,
      }}
    >
      {glow && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 820,
            height: 820,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            opacity: glowStrength * pulse,
          }}
        />
      )}

      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 42%, rgba(0, 0, 0, ${vignette}) 100%)`,
          pointerEvents: "none",
        }}
      />

      {children && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            zIndex: 1,
          }}
        >
          {children}
        </div>
      )}
    </AbsoluteFill>
  );
};
