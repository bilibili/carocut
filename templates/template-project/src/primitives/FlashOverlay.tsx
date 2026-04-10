import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * FlashOverlay - Expanding light burst overlay.
 *
 * Useful for shock cuts, memory flashes, camera hits, and stylized chapter
 * breaks. It scales a radial flare while briefly flooding the frame with light.
 *
 * @example
 * <FlashOverlay />
 *
 * @example
 * <FlashOverlay color="#fbbf24" intensity={0.85} expansion={1.8} />
 */
interface FlashOverlayProps {
  /** Flash color. */
  color?: string;
  /** Peak opacity multiplier from 0 to 1. */
  intensity?: number;
  /** Final flare expansion scale. */
  expansion?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const FlashOverlay: React.FC<FlashOverlayProps> = ({
  color = "#ffffff",
  intensity = 1,
  expansion = 1.5,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const total = Math.max(1, durationInFrames);

  const flareScale = interpolate(
    frame,
    [0, Math.round(total * 0.4), total],
    [0, expansion, expansion],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const flareOpacity = interpolate(
    frame,
    [0, Math.round(total * 0.15), Math.round(total * 0.6), total],
    [0, intensity, intensity * 0.6, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const floodOpacity = interpolate(
    frame,
    [
      0,
      Math.round(total * 0.1),
      Math.round(total * 0.3),
      Math.round(total * 0.7),
      total,
    ],
    [0, intensity * 0.8, intensity * 0.4, intensity * 0.1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      className={className}
      style={{ zIndex: 200, pointerEvents: "none", ...style }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${color} 0%, ${color}cc 30%, ${color}44 60%, transparent 70%)`,
          opacity: flareOpacity,
          transform: `scale(${flareScale})`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundColor: color,
          opacity: floodOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
