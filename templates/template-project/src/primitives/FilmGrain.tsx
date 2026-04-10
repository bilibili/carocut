import React, { useId } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * FilmGrain - Animated analog grain overlay.
 *
 * Adds subtle texture to reduce sterile digital surfaces and help generated
 * imagery feel less plastic. Place it high in the layer stack over a shot or
 * full composition.
 *
 * @example
 * <FilmGrain />
 *
 * @example
 * <FilmGrain intensity={0.08} speed={1.4} fadeInSec={0.4} />
 */
interface FilmGrainProps {
  /** Overall grain opacity multiplier. */
  intensity?: number;
  /** Speed multiplier for grain reseeding. */
  speed?: number;
  /** Seconds used for the initial fade-in. */
  fadeInSec?: number;
  /** Blend mode applied to the grain layer. */
  blendMode?: React.CSSProperties["mixBlendMode"];
  /** Base turbulence frequency. */
  baseFrequency?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const FilmGrain: React.FC<FilmGrainProps> = ({
  intensity = 0.05,
  speed = 1,
  fadeInSec = 1,
  blendMode = "overlay",
  baseFrequency = 0.75,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const filterId = `${useId().replace(/[:]/g, "")}-film-grain-filter`;

  const seedInterval = Math.max(1, Math.round(fps / (4 * speed)));
  const seed = Math.floor(frame / seedInterval);
  const fadeIn = interpolate(
    frame,
    [0, Math.max(1, Math.round(fadeInSec * fps))],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      className={className}
      style={{
        pointerEvents: "none",
        opacity: intensity * fadeIn,
        mixBlendMode: blendMode,
        ...style,
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={baseFrequency}
            numOctaves={4}
            stitchTiles="stitch"
            seed={seed}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} opacity={0.5} />
      </svg>
    </AbsoluteFill>
  );
};
