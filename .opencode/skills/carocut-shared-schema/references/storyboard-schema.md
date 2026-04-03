# Storyboard Schema

storyboard.yaml 的完整字段定义。Planner 生成时遵守、Builder 实现时参考。

## Output Format (storyboard.yaml)

```yaml
storyboard:
  - shot_id: shot_001
    chapter: "Ch1"
    duration_ms: 3000
    visual_description: "Medium close-up (MCU) of subject, eye level, static camera. Soft key light from camera right, minimal shadows. Background shows blurred environment (bokeh)."
    voiceover_refs: [VO_001]
    resource_refs: [char_001, aud_001]

    # ── 视觉语言字段 ──
    framing: "MCU"                    # 景别
    camera_movement: "static"         # 运镜效果（对应 KenBurns 组件的 effect）
    pacing: "medium"                  # 节奏
    visual_tension: 0.4               # 视觉张力 0.0-1.0
    audio_visual_relation: "sync"     # 声画关系
    transition_in:                    # 入场转场
      type: "fade"
      duration_ms: 500
    breathing: false                  # 是否为呼吸段

  - shot_id: shot_002
    chapter: "Ch1"
    duration_ms: 2500
    visual_description: "Extreme close-up (ECU) of hands interacting with object, slightly high angle, static. Sharp focus on object, hands slightly out of focus. Hard lighting creates clear shadows."
    voiceover_refs: [VO_002]
    resource_refs: [vis_003, aud_001]

    framing: "ECU"
    camera_movement: "static"
    pacing: "medium"
    visual_tension: 0.5
    audio_visual_relation: "sync"
    transition_in:
      type: "cut"
      duration_ms: 0
    breathing: false

  - shot_id: shot_003
    chapter: "Ch1"
    duration_ms: 4000
    visual_description: "Wide shot (WS) of environment, eye level, slow push in (0.5s duration). Fluorescent overhead lighting, clinical color temperature. Subject visible at far end, establishing spatial context."
    voiceover_refs: [VO_003, VO_004]
    resource_refs: [char_001, aud_002]

    framing: "LS"
    camera_movement: "slow-push"
    pacing: "slow"
    visual_tension: 0.3
    audio_visual_relation: "lead-visual"
    transition_in:
      type: "wipe-left"
      duration_ms: 600
    breathing: false

  - shot_id: shot_003b
    chapter: "Ch1-Ch2"
    duration_ms: 2500
    visual_description: "Breathing space: soft gradient background, no text, no subject. Slow dissolve in and out."
    voiceover_refs: []
    resource_refs: [aud_002]

    framing: "ELS"
    camera_movement: "static"
    pacing: "pause"
    visual_tension: 0.1
    audio_visual_relation: "sync"
    transition_in:
      type: "dissolve-blur"
      duration_ms: 800
    breathing: true

  - shot_id: shot_004
    chapter: "Ch2"
    duration_ms: 3500
    visual_description: "Animated data visualization: bar chart growing from zero to final values on dark background. Smooth animation over 2 seconds, then hold. Soft rim lighting creates depth."
    voiceover_refs: []
    resource_refs: [data_001]

    framing: "MS"
    camera_movement: "slow-push"
    pacing: "medium"
    visual_tension: 0.6
    audio_visual_relation: "sync"
    transition_in:
      type: "fade"
      duration_ms: 500
    breathing: false
```

## 视觉语言字段参考

以下字段为每个 shot 必填。它们为下游 Remotion 组件提供直接参数映射。

### framing 景别

| 值 | 含义 | 适用场景 |
|----|------|---------|
| ECU | 极特写 | 纹理、细节、情感高潮 |
| CU | 特写 | 人物表情、物件重点 |
| MCU | 中近景 | 人物上半身、产品展示 |
| MS | 中景 | 默认，信息展示 |
| MLS | 中远景 | 环境+主体 |
| LS | 远景 | 场景展示、建立空间 |
| ELS | 大远景 | 宏观概念、开场/结尾 |

### camera_movement 运镜

对应 KenBurns 组件的 `effect` 参数：

| 值 | KenBurns effect | 情感含义 |
|----|----------------|---------|
| static | 不使用 KenBurns | 稳定、客观陈述 |
| slow-push | zoom-in | 逐渐聚焦、引起注意 |
| slow-pull | zoom-out | 揭示全貌、释放张力 |
| pan-left | pan-left | 时间推进、展示连续 |
| pan-right | pan-right | 时间推进、展示连续 |
| pan-up | pan-up | 上升、积极情绪 |
| pan-down | pan-down | 沉降、沉思 |
| zoom-corner | zoom-in-top-left/right/bottom-left/right | 聚焦特定区域 |

### pacing 节奏

| 值 | shot 时长范围 | 动画速度 | 适用场景 |
|----|-------------|---------|---------|
| slow | 5-10s | 0.6x | 沉思、情感、留白 |
| medium | 3-5s | 1.0x | 默认，信息传达 |
| fast | 1-3s | 1.5x | 紧张、数据密集、快切蒙太奇 |
| pause | 2-3s | 0.3x | 呼吸段、章节过渡 |

### visual_tension 视觉张力

- 0.0-0.3: 平静、空旷构图、大留白
- 0.3-0.6: 中等、均衡构图
- 0.6-0.8: 紧张、元素密集、动画幅度大
- 0.8-1.0: 高潮、极端构图、快速动画

### audio_visual_relation 声画关系

| 值 | 含义 | audio_offset 效果 |
|----|------|------------------|
| sync | 声画同步（默认）| offset = 0 |
| lead-visual | 画面先于旁白出现 | 画面提前 300-1000ms |
| lead-audio | 旁白先于画面 | 旁白提前 300-500ms |
| counterpoint | 画面展示隐喻/对比 | offset = 0，但画面内容与旁白不直接对应 |

### transition_in 转场

`transition_in` 为结构体，包含 `type` 和 `duration_ms` 两个字段：

| type 值 | 含义 |
|---------|------|
| cut | 硬切（无过渡） |
| fade | 淡入淡出 |
| circle-wipe | 圆形擦除 |
| diagonal-wipe | 对角线擦除 |
| iris | 菱形展开 |
| curtain | 幕布打开 |
| blinds | 百叶窗 |
| zoom-fade | 缩放淡入 |
| dissolve-blur | 模糊溶解 |
| wipe-left | 水平向左擦除 |
| wipe-right | 水平向右擦除 |
| mask-circle | 圆形遮罩揭示 |
| mask-rectangle | 矩形遮罩揭示 |

### breathing 呼吸段

- `true`: 该 shot 为呼吸段（无旁白，2-3秒，用于章节过渡）
- `false`: 常规 shot（默认）

## Visual Description Requirements

Must include (where applicable):

- **Shot Size** - ECU, CU, MCU, MS, MLS, LS, ELS with subject specified
- **Camera Angle** - Eye level, High angle, Low angle, Dutch, Overhead
- **Camera Movement** - Static OR specific movement with duration/speed
- **Lighting** - Quality (hard/soft), direction, color temperature
- **Focus** - What's sharp, what's blurred, any focus pulls
- **Composition** - Subject placement, rule of thirds, headroom, lead room

## Description Guidelines

Use technical precision, not emotional language:

| Wrong | Correct |
|-------|---------|
| "beautiful lighting" | "Soft key light from camera right" |
| "dramatic camera move" | "Slow push in over 2 seconds" |
| "perfectly framed" | "Subject in left third, looking right (lead room)" |
| "stunning visual" | "High contrast silhouette against bright background" |
