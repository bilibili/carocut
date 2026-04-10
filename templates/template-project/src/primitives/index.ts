/**
 * CaroCut Primitives - Pre-built atomic visual capability components.
 *
 * These components provide the building blocks for creating
 * expressive, cinematic video compositions. Each component
 * is fully parametric and handles its own frame calculations.
 *
 * Usage:
 *   import { KenBurns, AnimatedText, SplitScreen } from '../primitives';
 *
 * P0 (Core):
 *   - KenBurns: Pan/zoom on static images (Ken Burns effect)
 *   - AnimatedText: Text animations (typewriter, fade, spring, highlight, counter)
 *   - AnimatedChart: Data viz with growth animations (bar, horizontal-bar, progress-ring)
 *   - Transition: Clip-path/mask-based reveals (circle-wipe, blinds, zoom-fade, etc.)
 *   - BreathingSpace: Visual pause segments (gradients, particles, fade)
 *   - SplitScreen: Multi-panel layouts (horizontal, vertical, picture-in-picture)
 *
 * P1 (Enhanced):
 *   - DynamicBackground: Animated backgrounds (flowing-gradient, mesh, grid, dots, aurora)
 *   - MaskReveal: Geometric mask reveal animations (circle, wipe, diamond, split)
 *   - VideoClip: Video embedding with fade/rate/volume controls
 *
 * P2 (Cinematic):
 *   - CinematicBackdrop: Soft breathing background for chapter pauses and sparse interludes
 *   - ParticleSystem: Ambient particles for atmosphere, energy, or suspended depth
 *   - GlitchEffect: Digital interference wrapper for signal loss, corruption, and unstable reveals
 *   - EdgeDissolve: Edge erosion wrapper for collapse, memory decay, and stylized exits
 *
 * P3 (Stylized 2D):
 *   - NeonText: Emissive headline text for title cards, warnings, and UI-like callouts
 *   - FilmGrain: Analog texture overlay to break up overly clean digital imagery
 *   - GlowEffect: Soft bloom-like emphasis around a frame region or wrapped content
 *   - FlashOverlay: Expanding burst of light for shocks, hits, and memory flashes
 *   - ColorSweep: Directional glowing wipe for chapter passes and dramatic accents
 */

export { KenBurns } from "./KenBurns";
export { AnimatedText } from "./AnimatedText";
export type { AnimatedTextProps } from "./AnimatedText";
export { AnimatedChart } from "./AnimatedChart";
export type { AnimatedChartProps } from "./AnimatedChart";
export { Transition } from "./Transition";
export { BreathingSpace } from "./BreathingSpace";
export { SplitScreen } from "./SplitScreen";
export type { SplitScreenProps } from "./SplitScreen";
export { DynamicBackground } from "./DynamicBackground";
export { MaskReveal } from "./MaskReveal";
export { VideoClip } from "./VideoClip";
export { CinematicBackdrop } from "./CinematicBackdrop";
export { ParticleSystem } from "./ParticleSystem";
export { GlitchEffect } from "./GlitchEffect";
export { EdgeDissolve } from "./EdgeDissolve";
export { NeonText } from "./NeonText";
export { FilmGrain } from "./FilmGrain";
export { GlowEffect } from "./GlowEffect";
export { FlashOverlay } from "./FlashOverlay";
export { ColorSweep } from "./ColorSweep";
