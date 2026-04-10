import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * ParticleSystem - Parameterized atmosphere particles.
 *
 * Renders lightweight ambient particles that can drift, rise, fall, or move
 * radially. Use it as a cinematic texture layer behind titles, transitions,
 * pauses, and mood-heavy shots.
 *
 * @example
 * <ParticleSystem color="#dbeafe" count={40} />
 *
 * @example
 * <ParticleSystem pattern="radial-out" color="#8b5cf6" count={90} glow />
 */
type ParticlePattern = "float" | "radial-out" | "radial-in" | "rise" | "fall";

interface ParticleSystemProps {
  /** Particle fill color. */
  color?: string;
  /** Number of particles to render. */
  count?: number;
  /** Motion pattern used for all particles. */
  pattern?: ParticlePattern;
  /** Minimum particle diameter in pixels. */
  minSize?: number;
  /** Maximum particle diameter in pixels. */
  maxSize?: number;
  /** Motion speed multiplier. */
  speed?: number;
  /** Particle opacity before pulsing is applied. */
  opacity?: number;
  /** Adds a soft glow around each particle. */
  glow?: boolean;
  /** Inline style for the outer wrapper. */
  style?: React.CSSProperties;
  className?: string;
}

interface ParticleSeed {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  phase: number;
}

const seeded = (seed: number) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
};

const generateParticles = (count: number): ParticleSeed[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index,
    x: seeded(index * 0.9 + 1.1) * 100,
    y: seeded(index * 1.7 + 2.3) * 100,
    size: seeded(index * 2.1 + 3.7),
    speedX: seeded(index * 3.3 + 5.1) - 0.5,
    speedY: seeded(index * 4.4 + 8.2) - 0.5,
    phase: seeded(index * 5.9 + 13.4) * Math.PI * 2,
  }));

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  color = "#dbeafe",
  count = 60,
  pattern = "float",
  minSize = 2,
  maxSize = 6,
  speed = 1,
  opacity = 0.6,
  glow = true,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const particles = React.useMemo(() => generateParticles(count), [count]);

  const getPosition = (particle: ParticleSeed) => {
    const baseT = t * speed;

    switch (pattern) {
      case "float":
        return {
          x: (particle.x + Math.sin(baseT + particle.phase) * 3 + 100) % 100,
          y:
            (particle.y + Math.cos(baseT * 0.7 + particle.phase) * 3 + 100) %
            100,
        };
      case "radial-out": {
        const angle = Math.atan2(particle.y - 50, particle.x - 50);
        const distance = (baseT * 10 + particle.phase * 5) % 52;
        return {
          x: 50 + Math.cos(angle) * distance,
          y: 50 + Math.sin(angle) * distance,
        };
      }
      case "radial-in": {
        const angle = Math.atan2(particle.y - 50, particle.x - 50);
        const maxDistance = 52;
        const distance =
          maxDistance - ((baseT * 10 + particle.phase * 5) % maxDistance);
        return {
          x: 50 + Math.cos(angle) * distance,
          y: 50 + Math.sin(angle) * distance,
        };
      }
      case "rise":
        return {
          x: particle.x + Math.sin(baseT + particle.phase) * 2,
          y:
            ((particle.y - baseT * (12 + particle.speedY * 6)) % 100 + 100) %
            100,
        };
      case "fall":
        return {
          x: particle.x + Math.sin(baseT + particle.phase) * 2,
          y: (particle.y + baseT * (12 + particle.speedY * 6)) % 100,
        };
      default:
        return { x: particle.x, y: particle.y };
    }
  };

  const getSize = (particle: ParticleSeed) => {
    const baseSize = minSize + particle.size * Math.max(0, maxSize - minSize);
    const pulse = 1 + Math.sin(t * 2 + particle.phase) * 0.18;
    return baseSize * pulse;
  };

  return (
    <AbsoluteFill className={className} style={style}>
      {particles.map((particle) => {
        const position = getPosition(particle);
        const size = getSize(particle);

        return (
          <div
            key={particle.id}
            style={{
              position: "absolute",
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity,
              boxShadow: glow
                ? `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}`
                : "none",
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
