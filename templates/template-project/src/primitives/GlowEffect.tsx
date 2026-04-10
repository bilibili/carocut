import React from "react";
import { AbsoluteFill } from "remotion";

/**
 * GlowEffect - Soft emissive frame glow.
 *
 * Use it to add bloom-like emphasis around an object region, title card, or
 * full-frame highlight. It can act as a standalone overlay or wrap sparse
 * child content.
 *
 * @example
 * <GlowEffect color="#fbbf24" intensity={0.3} />
 *
 * @example
 * <GlowEffect color="#67e8f9" intensity={0.45} borderRadius={24}>
 *   <MyCenteredGraphic />
 * </GlowEffect>
 */
interface GlowEffectProps {
  /** Glow color. Hex colors produce the cleanest layered falloff. */
  color?: string;
  /** Strength from 0 to 1. */
  intensity?: number;
  /** Radius for rounded glow regions. */
  borderRadius?: number | string;
  /** Optional inset for the glowing area. */
  inset?: number;
  /** Wrapped content. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return hex;
  }

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const GlowEffect: React.FC<GlowEffectProps> = ({
  color = "#fbbf24",
  intensity = 0.3,
  borderRadius = 0,
  inset = 0,
  children,
  style,
  className,
}) => {
  const innerGlow = `${hexToRgba(color, intensity * 0.6)} 0 0 20px 5px`;
  const midGlow = `${hexToRgba(color, intensity * 0.3)} 0 0 60px 15px`;
  const outerGlow = `${hexToRgba(color, intensity * 0.12)} 0 0 120px 40px`;

  return (
    <AbsoluteFill className={className} style={style}>
      <AbsoluteFill
        style={{
          top: inset,
          right: inset,
          bottom: inset,
          left: inset,
          pointerEvents: "none",
          boxShadow: `${innerGlow}, ${midGlow}, ${outerGlow}`,
          borderRadius,
        }}
      />
      {children && (
        <AbsoluteFill style={{ position: "relative", zIndex: 1 }}>
          {children}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
