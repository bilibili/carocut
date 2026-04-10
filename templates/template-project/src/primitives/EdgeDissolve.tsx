import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * EdgeDissolve - Edge erosion and collapse wrapper.
 *
 * Gradually erodes content from the edges inward using blur, pixelation, and
 * a base-color reveal. Use it for unstable memories, virtual breakdown,
 * degraded monitors, or stylized shot exits.
 *
 * @example
 * <EdgeDissolve intensity={0.7}>
 *   <MyShot />
 * </EdgeDissolve>
 *
 * @example
 * <EdgeDissolve startSec={0.8} durationSec={1.2} baseColor="rgba(2, 6, 23, 1)">
 *   <MyShot />
 * </EdgeDissolve>
 */
interface EdgeDissolveProps {
  /** Effect strength from 0 to 1. */
  intensity?: number;
  /** Delay before the dissolve begins, in seconds. */
  startSec?: number;
  /** Effect duration in seconds. Defaults to the full sequence duration. */
  durationSec?: number;
  /** Pixel block size used for the dissolve fringe. */
  pixelSize?: number;
  /** Maximum blur applied to the surviving inner image. */
  maxBlur?: number;
  /** Color revealed behind the dissolving content. */
  baseColor?: string;
  /** Wrapped content. */
  children: React.ReactNode;
}

export const EdgeDissolve: React.FC<EdgeDissolveProps> = ({
  intensity = 0.6,
  startSec = 0,
  durationSec,
  pixelSize = 8,
  maxBlur = 12,
  baseColor = "rgba(15, 23, 42, 1)",
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const startFrame = Math.round(startSec * fps);
  const animationFrames = durationSec
    ? Math.round(durationSec * fps)
    : durationInFrames;
  const safeDuration = Math.max(animationFrames, 1);
  const adjustedFrame = Math.max(0, frame - startFrame);

  const progress = interpolate(adjustedFrame, [0, safeDuration], [0, intensity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const blur = interpolate(progress, [0, 0.5, 1], [0, maxBlur * 0.6, maxBlur], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const insetPercent = interpolate(progress, [0, 1], [0, 45], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const noiseOpacity = interpolate(progress, [0.3, 1], [0, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const overlayOpacity = interpolate(progress, [0.2, 1], [0, 0.95], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const edgeNoiseOpacity = interpolate(progress, [0.25, 1], [0, 0.32], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ position: "relative" }}>
      <AbsoluteFill
        style={{
          clipPath: `inset(${insetPercent}% ${insetPercent}% ${insetPercent}% ${insetPercent}%)`,
          filter: `blur(${blur}px)`,
        }}
      >
        {children}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          opacity: noiseOpacity,
          pointerEvents: "none",
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0) 0,
              rgba(255, 255, 255, 0) ${Math.max(2, pixelSize)}px,
              rgba(255, 255, 255, 0.22) ${Math.max(2, pixelSize)}px,
              rgba(255, 255, 255, 0.22) ${Math.max(3, pixelSize + 1)}px
            ),
            radial-gradient(
              circle at center,
              transparent ${Math.max(0, 44 - insetPercent * 0.4)}%,
              rgba(255, 255, 255, ${edgeNoiseOpacity}) ${Math.max(0, 64 - insetPercent * 0.2)}%,
              rgba(255, 255, 255, 0) 100%
            )
          `,
          mixBlendMode: "screen",
        }}
      />

      <AbsoluteFill
        style={{
          backgroundColor: baseColor,
          opacity: overlayOpacity,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
