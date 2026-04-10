import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * NeonText - Stylized glowing title text.
 *
 * Use this for bold title cards, UI callouts, synthetic signage, and any shot
 * that benefits from a crisp emissive text treatment with optional pulse or
 * flicker.
 *
 * @example
 * <NeonText text="SIGNAL" color="cyan" />
 *
 * @example
 * <NeonText text="WARNING" color="red" flicker pulse intensity={1.2} />
 */
type NeonColor = "cyan" | "purple" | "red" | "green" | "white" | "amber";

interface NeonTextProps {
  /** Text content. */
  text: string;
  /** Preset glow palette. */
  color?: NeonColor;
  /** Font size in pixels. */
  fontSize?: number;
  /** Font weight for the rendered text. */
  fontWeight?: number;
  /** Enables a subtle continuous pulse. */
  pulse?: boolean;
  /** Enables intermittent brightness flicker. */
  flicker?: boolean;
  /** Multiplies glow strength. */
  intensity?: number;
  /** Overrides the preset text color. */
  customColor?: string;
  /** Delay before the text starts fading in. */
  delaySec?: number;
  /** Inline style for the text node. */
  style?: React.CSSProperties;
  className?: string;
}

const COLOR_MAP: Record<NeonColor, { main: string; glow: string }> = {
  cyan: { main: "#67e8f9", glow: "rgba(103, 232, 249, 0.65)" },
  purple: { main: "#c084fc", glow: "rgba(192, 132, 252, 0.65)" },
  red: { main: "#f87171", glow: "rgba(248, 113, 113, 0.65)" },
  green: { main: "#4ade80", glow: "rgba(74, 222, 128, 0.65)" },
  white: { main: "#ffffff", glow: "rgba(255, 255, 255, 0.55)" },
  amber: { main: "#fbbf24", glow: "rgba(251, 191, 36, 0.65)" },
};

export const NeonText: React.FC<NeonTextProps> = ({
  text,
  color = "cyan",
  fontSize = 72,
  fontWeight = 700,
  pulse = false,
  flicker = false,
  intensity = 1,
  customColor,
  delaySec = 0,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);
  const adjustedFrame = Math.max(0, frame - delayFrames);

  const palette = customColor
    ? { main: customColor, glow: `${customColor}80` }
    : COLOR_MAP[color];

  const fadeInDuration = Math.max(1, Math.round(fps * 0.5));
  const opacity = interpolate(adjustedFrame, [0, fadeInDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulseFactor = pulse
    ? 0.82 + Math.sin((adjustedFrame / fps) * Math.PI * 2 * 2) * 0.18
    : 1;

  let flickerOpacity = 1;
  if (flicker) {
    const flicker1 = Math.sin(adjustedFrame * 0.7) > 0.95 ? 0.62 : 1;
    const flicker2 = Math.sin(adjustedFrame * 1.3) > 0.97 ? 0.74 : 1;
    const flicker3 = Math.sin(adjustedFrame * 2.1) > 0.98 ? 0.55 : 1;
    flickerOpacity = Math.min(flicker1, flicker2, flicker3);
  }

  const baseGlow = 20 * intensity * pulseFactor;
  const textShadow = `
    0 0 ${baseGlow * 0.5}px ${palette.glow},
    0 0 ${baseGlow}px ${palette.glow},
    0 0 ${baseGlow * 2}px ${palette.glow},
    0 0 ${baseGlow * 3}px ${palette.glow}
  `;

  return (
    <span
      className={className}
      style={{
        color: palette.main,
        fontSize,
        fontWeight,
        textShadow,
        opacity: opacity * flickerOpacity,
        fontFamily: '"Rajdhani", "Noto Sans SC", system-ui, sans-serif',
        letterSpacing: "0.05em",
        ...style,
      }}
    >
      {text}
    </span>
  );
};
