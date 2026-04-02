---
name: carocut-resource-schema
description: 资源类型共享定义。所有 agent 共用的 resources.yaml 类型注册表，定义合法类型、source 值、消费者映射和能力边界。Planner 写入时遵守、Media 处理时校验、Builder 实现时参考。
---

# Resource Schema

Single source of truth for `manifests/resources.yaml` type definitions. Loaded by Planner (Stage 2), Media (step-4), and Builder (step-7).

## Resource Type Registry

### visual — Media step-4 处理

| type | source | Media tool | 说明 |
|------|--------|-----------|------|
| `image` | `existing` | 无（已在 raws/） | 用户提供的图片 |
| `image` | `retrieve` | `images_search` | Pexels/Pixabay 库存图片 |
| `image` | `generate` | `images_generate` | AI 生成自定义图片 |
| `video` | `existing` | 无（已在 raws/） | 用户提供的视频 |
| `video` | `retrieve` | Pexels Video API | 库存视频检索。Media 不能生成视频 |
| `sprite` | `generate` | `images_generate` (mode=sprite) | 精灵图动画，含自动验证 |


### audio — Media step-5 处理

| type | source | Media tool | 说明 |
|------|--------|-----------|------|
| `voiceover` | — | `audio_batch_tts` / `audio_tts_single` | Edge TTS 生成，speed 由 storyboard pacing 驱动 |
| `music` | — | Freesound search | BGM，BPM 匹配 storyboard pacing |
| `sfx` | — | `audio_search_sfx` | 音效，Freesound 检索 |

### data — Builder step-7 直接消费，Media 不处理

| type | consumer | 说明 |
|------|----------|------|
| `table` | Builder → `DataTable` 组件 | 结构化表格数据 |
| `chart` | Builder → `AnimatedChart` 组件 | 图表数据（bar/horizontal-bar/progress-ring） |
| `statistics` | Builder → `AnimatedText mode="counter"` | 关键指标数字 |

### components — Builder step-7 直接消费，Media 不处理

| type | consumer | 说明 |
|------|----------|------|
| `motion-graphics` | Builder → `src/components/*.tsx` | 所有需要代码绘制的画面元素 |

涵盖：图解、流程图、数据卡片、对比表、代码块、时间线、架构图、动态信息图等。

**Planner 规则：** 只描述画面意图和数据内容，不写 CSS/React/动画细节。Builder 根据 description + storyboard visual_description 决定实现方式。

---

## source 值规范

| source | 含义 | 适用类型 |
|--------|------|---------|
| `existing` | 用户已提供，在 raws/ 中 | image, video |
| `retrieve` | 库存搜索（Pexels/Pixabay/Freesound） | image, video |
| `generate` | AI 生成（需要 CARO_LLM_API_KEY） | image, sprite |
| 无 source 字段 | Builder 代码实现，无需外部素材 | data, components |

**禁止：** `pexels_video` 等工具级 source 值。视频检索统一用 `source: retrieve` + `type: video`。

---

## resources.yaml 完整格式

```yaml
resources:
  visual:
    - id: vis_001
      type: image              # image | video | sprite
      description: "Precise description"
      source: existing | retrieve | generate

    - id: vis_002
      type: video
      description: "Stock video description"
      source: retrieve
      duration_ms: 5000

    - id: vis_003
      type: sprite
      description: "Character sprite sheet"
      source: generate
      sprite:
        cols: 8
        rows: 4
        frameWidth: 512
        frameHeight: 512
        chromaKey: "#ff00ff"
        animations:
          idle: { row: 0, frameCount: 8 }
          walk: { row: 1, frameCount: 8 }

  audio:
    - id: aud_001
      type: voiceover
      description: "Voice character and tone"
      character: "zh-CN-XiaoxiaoNeural"

    - id: aud_002
      type: music
      description: "BGM mood and tempo"

    - id: aud_003
      type: sfx
      description: "Sound effect description"

  data:
    - id: data_001
      type: table | chart | statistics
      description: "Data description"
      structure: { ... }

  components:
    - id: comp_001
      type: motion-graphics
      description: "画面意图描述（不含实现细节）"
      used_in: [shot_003, shot_008]

characters:
  - id: char_001
    name: "Narrator"
    description: "Character description"
```

---

## 消费者映射总览

```
Planner (写入)
    │
    ▼
resources.yaml
    │
    ├── visual ──────► Media step-4 ──► raws/images/, raws/videos/
    ├── audio ───────► Media step-5 ──► raws/audio/
    ├── data ────────► Builder step-7 (直接读取 structure 字段)
    ├── components ──► Builder step-7 (读取 description，生成 React 组件)
    └── characters ──► Media (TTS voice) + Builder (视觉渲染)
```

---

## 能力边界

### Media 能做

- 检索库存图片/视频（Pexels/Pixabay）
- AI 生成图片和精灵图
- 移除图片背景
- 生成 TTS 语音
- 检索 BGM/SFX（Freesound）

### Media 不能做

- 生成视频（只能检索）
- 处理 data 类型（table/chart/statistics）
- 处理 components 类型（motion-graphics）
- 生成动画（animation 类型不存在）

### Builder 直接消费

- data 类型 → AnimatedChart / DataTable 组件
- components 类型 → 项目级 src/components/*.tsx
- characters → 视觉渲染（SpriteSheet 等）
