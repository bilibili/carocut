import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * ColorSweep - Full-frame directional color pass.
 *
 * A glowing bar sweeps across the frame with a trailing gradient and a tinted
 * cover region. Use it for energetic scene transitions, chapter wipes, and
 * stylized motion accents.
 *
 * @example
 * <ColorSweep />
 *
 * @example
 * <ColorSweep color="#fbbf24" direction="top-to-bottom" barSizePercent={24} />
 */
type SweepDirection =
  | "left-to-right"
  | "right-to-left"
  | "top-to-bottom"
  | "bottom-to-top";

interface ColorSweepProps {
  /** Sweep color for the leading bar. */
  color?: string;
  /** Sweep direction. */
  direction?: SweepDirection;
  /** Sweep bar size as a percentage of the frame. */
  barSizePercent?: number;
  /** Trailing gradient size as a percentage of the frame. */
  trailSizePercent?: number;
  /** Tint color left behind the sweep. */
  coverColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const ColorSweep: React.FC<ColorSweepProps> = ({
  color = "#fbbf24",
  direction = "left-to-right",
  barSizePercent = 30,
  trailSizePercent = 20,
  coverColor = "#0f172a",
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const total = Math.max(1, durationInFrames);

  const progress = interpolate(frame, [0, total], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const travelDistance = 100 + barSizePercent;
  const barPosition = progress * travelDistance;

  const getPosition = (): React.CSSProperties => {
    switch (direction) {
      case "left-to-right":
        return {
          left: `${barPosition - barSizePercent}%`,
          top: 0,
          width: `${barSizePercent}%`,
          height: "100%",
        };
      case "right-to-left":
        return {
          right: `${barPosition - barSizePercent}%`,
          top: 0,
          width: `${barSizePercent}%`,
          height: "100%",
        };
      case "top-to-bottom":
        return {
          left: 0,
          top: `${barPosition - barSizePercent}%`,
          width: "100%",
          height: `${barSizePercent}%`,
        };
      case "bottom-to-top":
        return {
          left: 0,
          bottom: `${barPosition - barSizePercent}%`,
          width: "100%",
          height: `${barSizePercent}%`,
        };
    }
  };

  const getTrailStyle = (): React.CSSProperties => {
    switch (direction) {
      case "left-to-right":
        return {
          left: `${barPosition - barSizePercent - trailSizePercent}%`,
          top: 0,
          width: `${trailSizePercent}%`,
          height: "100%",
          background: `linear-gradient(to right, transparent, ${color}88)`,
        };
      case "right-to-left":
        return {
          right: `${barPosition - barSizePercent - trailSizePercent}%`,
          top: 0,
          width: `${trailSizePercent}%`,
          height: "100%",
          background: `linear-gradient(to left, transparent, ${color}88)`,
        };
      case "top-to-bottom":
        return {
          left: 0,
          top: `${barPosition - barSizePercent - trailSizePercent}%`,
          width: "100%",
          height: `${trailSizePercent}%`,
          background: `linear-gradient(to bottom, transparent, ${color}88)`,
        };
      case "bottom-to-top":
        return {
          left: 0,
          bottom: `${barPosition - barSizePercent - trailSizePercent}%`,
          width: "100%",
          height: `${trailSizePercent}%`,
          background: `linear-gradient(to top, transparent, ${color}88)`,
        };
    }
  };

  const getCoverStyle = (): React.CSSProperties => {
    switch (direction) {
      case "left-to-right":
        return {
          left: 0,
          top: 0,
          width: `${Math.max(0, barPosition - barSizePercent)}%`,
          height: "100%",
        };
      case "right-to-left":
        return {
          right: 0,
          top: 0,
          width: `${Math.max(0, barPosition - barSizePercent)}%`,
          height: "100%",
        };
      case "top-to-bottom":
        return {
          left: 0,
          top: 0,
          width: "100%",
          height: `${Math.max(0, barPosition - barSizePercent)}%`,
        };
      case "bottom-to-top":
        return {
          left: 0,
          bottom: 0,
          width: "100%",
          height: `${Math.max(0, barPosition - barSizePercent)}%`,
        };
    }
  };

  const coverOpacity = interpolate(
    frame,
    [0, Math.round(total * 0.3), Math.round(total * 0.6), total],
    [0, 0.7, 0.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      className={className}
      style={{ zIndex: 200, pointerEvents: "none", ...style }}
    >
      <AbsoluteFill
        style={{
          ...getCoverStyle(),
          backgroundColor: coverColor,
          opacity: coverOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          ...getTrailStyle(),
        }}
      />
      <div
        style={{
          position: "absolute",
          ...getPosition(),
          backgroundColor: color,
          boxShadow: `0 0 40px ${color}88, 0 0 80px ${color}44`,
        }}
      />
    </AbsoluteFill>
  );
};
