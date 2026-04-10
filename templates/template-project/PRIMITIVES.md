# CaroCut Primitives Guide

This template ships with a layered set of reusable Remotion primitives for cinematic video work.

The goal of these primitives is not to give you finished shots. The goal is to give you composable visual building blocks you can combine into your own shot language.

## Quick Start

Import primitives from `src/primitives`:

```tsx
import {
  AnimatedText,
  DynamicBackground,
  FilmGrain,
  GlitchEffect,
  KenBurns,
  NeonText,
  ParticleSystem,
} from "./src/primitives";
```

Typical composition pattern:

```tsx
<AbsoluteFill>
  <DynamicBackground variant="aurora" />
  <ParticleSystem pattern="float" opacity={0.35} />
  <KenBurns src={staticFile("hero.jpg")} effect="zoom-in" />
  <FilmGrain intensity={0.04} />
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
    <NeonText text="SIGNAL LOST" color="cyan" />
  </AbsoluteFill>
</AbsoluteFill>
```

## Layers

### P0 Core

Use these for the basic structure of a shot:

- `KenBurns`
- `AnimatedText`
- `AnimatedChart`
- `Transition`
- `BreathingSpace`
- `SplitScreen`

### P1 Enhanced

Use these when you need stronger image handling or backgrounds:

- `DynamicBackground`
- `MaskReveal`
- `VideoClip`

### P2 Cinematic

Use these to push atmosphere, instability, and mood:

- `CinematicBackdrop`
- `ParticleSystem`
- `GlitchEffect`
- `EdgeDissolve`

### P3 Stylized 2D

Use these when the shot needs stronger stylization:

- `NeonText`
- `FilmGrain`
- `GlowEffect`
- `FlashOverlay`
- `ColorSweep`

## Choosing a Primitive

If your shot needs camera motion on stills:

- `KenBurns`

If your shot needs animated titles, counters, or staggered copy:

- `AnimatedText`
- `NeonText`

If your shot needs charts or numeric displays:

- `AnimatedChart`

If your shot needs multi-panel composition:

- `SplitScreen`

If your shot needs a background treatment:

- `DynamicBackground`
- `BreathingSpace`
- `CinematicBackdrop`

If your shot needs texture or atmosphere:

- `ParticleSystem`
- `FilmGrain`
- `GlowEffect`

If your shot needs reveal, wipe, or degradation behavior:

- `Transition`
- `MaskReveal`
- `FlashOverlay`
- `ColorSweep`
- `GlitchEffect`
- `EdgeDissolve`

If your shot needs embedded footage:

- `VideoClip`

## Catalog

| Primitive | Best for | Notes |
| --- | --- | --- |
| `AnimatedText` | titles, subtitles, counters, key phrases | Supports `typewriter`, `fade-up`, `fade-down`, `spring-in`, `highlight`, `counter` |
| `AnimatedChart` | bar charts, horizontal comparisons, progress rings | Good for explainer, finance, or KPI shots |
| `BreathingSpace` | chapter pauses, narration gaps, visual resets | Includes gradient, fade, particles, radial pulse modes |
| `CinematicBackdrop` | minimal chapter interludes | Simpler and more restrained than `BreathingSpace` |
| `ColorSweep` | directional color pass, wipe accents | Better as a stylized overlay than as your only transition system |
| `DynamicBackground` | ambient animated backgrounds | Includes flowing gradients, mesh, grid, dots, vignette, aurora |
| `EdgeDissolve` | memory decay, system collapse, unstable exits | Wraps arbitrary children |
| `FilmGrain` | analog texture, less sterile frames | Usually works best at low intensity |
| `FlashOverlay` | shock hits, memory flashes, chapter punches | Full-frame burst overlay |
| `GlitchEffect` | signal loss, corruption, unstable UI, stylized reveals | Wraps arbitrary children; supports burst timing |
| `GlowEffect` | bloom-like emphasis around a region or object | Use subtly; easy to overdo |
| `KenBurns` | camera motion on still images | Presets plus custom movement states |
| `MaskReveal` | geometric reveal animations | Good for logos, portraits, title entrances |
| `NeonText` | emissive signage, UI callouts, cyber or synthetic titles | Supports pulse and flicker |
| `ParticleSystem` | atmosphere, suspended depth, energetic fields | Includes float, rise, fall, radial-in, radial-out |
| `SplitScreen` | before/after, compare/contrast, parallel action | Supports horizontal, vertical, and PiP |
| `Transition` | clip-path and transform-based entrance/exit reveals | Use inside a shot; not a replacement for all sequence editing |
| `VideoClip` | embedded video with fade and timing control | Wraps `OffthreadVideo` |

## Recommended Combinations

### Quiet Documentary

- `KenBurns`
- `AnimatedText` with `fade-up`
- `DynamicBackground` with low contrast
- `FilmGrain` at low intensity

### Tech Explainer

- `CinematicBackdrop`
- `ParticleSystem`
- `GlowEffect`
- `AnimatedText` or `NeonText`
- `ColorSweep` for section changes

### Memory Distortion

- `GlitchEffect`
- `EdgeDissolve`
- `FlashOverlay`
- `FilmGrain`

### Chapter Break

- `BreathingSpace` or `CinematicBackdrop`
- `AnimatedText`
- `GlowEffect`

## Usage Notes

- Many primitives default to using the full sequence duration if you do not pass a duration prop.
- Overlay primitives such as `FilmGrain`, `GlowEffect`, `FlashOverlay`, `ColorSweep`, and `GlitchEffect` usually belong near the top of the layer stack.
- Wrapper primitives such as `GlitchEffect`, `EdgeDissolve`, `MaskReveal`, and `Transition` are usually best around one focused visual region, not every layer at once.
- `NeonText`, `GlowEffect`, `ParticleSystem`, and `FilmGrain` are easy to stack too aggressively. Start lower than you think.
- `BreathingSpace` is for a designed pause. `CinematicBackdrop` is for a cleaner, quieter interlude base.

## Suggested Defaults

When in doubt:

- `FilmGrain intensity={0.03}`
- `ParticleSystem opacity={0.25}`
- `GlowEffect intensity={0.2}`
- `GlitchEffect intensity={0.3}`
- `EdgeDissolve intensity={0.5}`
- `NeonText intensity={0.9}`

## What This Guide Does Not Cover

- Project-specific shot components
- Audio layer helpers
- Storyboard structure
- 3D or topic-specific visual assets

This file is the operator guide for the built-in primitives. Source files in `src/primitives` remain the canonical reference for exact props and behavior.
