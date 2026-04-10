import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * GlitchEffect - Cinematic digital interference wrapper.
 *
 * Adds RGB separation, frame displacement, scan lines, and optional burst timing
 * to arbitrary child content. Use it for memory corruption, signal loss,
 * surveillance feeds, title hits, or stylized reveal moments.
 *
 * @example
 * <GlitchEffect intensity={0.45}>
 *   <img src="..." />
 * </GlitchEffect>
 *
 * @example
 * <GlitchEffect burst burstInterval={1.8} burstDuration={0.15}>
 *   <h1>UNSTABLE SIGNAL</h1>
 * </GlitchEffect>
 */
interface GlitchEffectProps {
  /** Overall effect strength from 0 to 1. */
  intensity?: number;
  /** Maximum RGB channel offset in pixels. */
  rgbShift?: number;
  /** Enables horizontal scan lines over the wrapped content. */
  scanLines?: boolean;
  /** When enabled, the effect only appears in short bursts. */
  burst?: boolean;
  /** Seconds between bursts when burst mode is enabled. */
  burstInterval?: number;
  /** Burst duration in seconds when burst mode is enabled. */
  burstDuration?: number;
  /** Wrapped content. */
  children: React.ReactNode;
  /** Inline style for the outer wrapper. */
  style?: React.CSSProperties;
  className?: string;
}

export const GlitchEffect: React.FC<GlitchEffectProps> = ({
  intensity = 0.5,
  rgbShift = 10,
  scanLines = true,
  burst = false,
  burstInterval = 2,
  burstDuration = 0.2,
  children,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const cyclePosition = burst ? t % burstInterval : 0;
  const activeIntensity =
    burst && cyclePosition >= burstDuration ? 0 : intensity;

  const seed1 = Math.sin(t * 13.7) * 0.5 + 0.5;
  const seed2 = Math.sin(t * 7.3 + 1.2) * 0.5 + 0.5;
  const seed3 = Math.sin(t * 23.1 + 0.7) * 0.5 + 0.5;
  const seed4 = Math.sin(t * 19.4 + 2.6) * 0.5 + 0.5;

  const isGlitching = activeIntensity > 0.08 && seed1 > 0.65;
  const displacementX = isGlitching
    ? Math.round((seed2 - 0.5) * 20 * activeIntensity)
    : 0;
  const displacementY = isGlitching
    ? Math.round((seed4 - 0.5) * 8 * activeIntensity)
    : 0;
  const chromaShift = Math.max(
    0,
    Math.round((Math.abs(seed3 - 0.5) + Math.abs(seed2 - 0.5)) * rgbShift * activeIntensity),
  );
  const scanLineOpacity = scanLines ? 0.03 + activeIntensity * 0.04 : 0;
  const ghostOpacity = activeIntensity > 0 ? 0.12 + activeIntensity * 0.1 : 0;

  return (
    <AbsoluteFill className={className} style={style}>
      <AbsoluteFill
        style={{
          transform: `translate(${displacementX}px, ${displacementY}px)`,
          filter: isGlitching
            ? `hue-rotate(${(seed2 - 0.5) * 24}deg) saturate(${1 + activeIntensity * 0.5})`
            : "none",
        }}
      >
        <AbsoluteFill style={{ opacity: 1 }}>{children}</AbsoluteFill>

        <AbsoluteFill
          style={{
            pointerEvents: "none",
            mixBlendMode: "screen",
            opacity: ghostOpacity,
            background: `linear-gradient(
              90deg,
              rgba(255, 0, 64, 0) 0%,
              rgba(255, 0, 64, 0.5) ${Math.max(0, 50 - chromaShift)}%,
              rgba(0, 255, 255, 0.45) ${Math.min(100, 50 + chromaShift)}%,
              rgba(0, 255, 255, 0) 100%
            )`,
          }}
        />
      </AbsoluteFill>

      {scanLines && (
        <AbsoluteFill
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, ${scanLineOpacity}) 2px,
              rgba(0, 0, 0, ${scanLineOpacity}) 4px
            )`,
            opacity: activeIntensity > 0 ? 1 : 0.6,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
