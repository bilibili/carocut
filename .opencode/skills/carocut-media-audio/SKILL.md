---
name: carocut-media-audio
description: 音频素材生成与获取。批量 Edge TTS 旁白生成（支持 storyboard pacing 字段驱动语速）、BGM/SFX 检索（BGM 节奏匹配 BPM 规则）、音频时长提取。包含 Edge voice 配置、速度调整规则、durations.json 格式规范（含 audio_visual_relation 说明）和关键的音频时序规则。
---

# Audio Assets

Generates voiceovers via TTS, retrieves background music and sound effects. Creates `durations.json` for timing synchronization in Remotion.

## Audio Types

| Type | Source | Output Directory |
|------|--------|------------------|
| Voiceover (VO) | Edge TTS | `{project_dir}/raws/audio/vo/` |
| Background Music (BGM) | Freesound | `{project_dir}/raws/audio/bgm/` |
| Sound Effects (SFX) | Freesound | `{project_dir}/raws/audio/sfx/` |

---

## Voiceover Generation

Generate speech audio from script using Edge TTS.

### TTS Batch Processing Workflow

Processes entire script.md and generates all voiceover files:
1. Parse `{project_dir}/manifests/script.md` for all `[VO_XXX]` markers and their text content
2. For each VO segment, invoke Edge TTS with the configured voice and speed
3. Save each result as `VO_XXX.wav` in `{project_dir}/raws/audio/vo/`
4. After all segments complete, extract durations to create `{project_dir}/manifests/durations.json`

### Voice Selection

完整 voice 列表和选择建议见 `references/edge-tts.md`。

| Input | Meaning | Recommendation |
|------|---------|----------------|
| `default` | Default alias | Maps to `zh-CN-XiaoxiaoNeural` |
| any valid edge-tts voice ID | Direct pass-through | 根据项目风格从 `references/edge-tts.md` 中选择 |

### Speed Adjustment Rules

- The default TTS voice may sound slow. Consider using speed `1.2` for more natural pacing.
- Speed range: `0.5` (half speed) to `2.0` (double speed)
- Recommended: `1.0` - `1.3` for narration, `0.8` - `1.0` for emotional/dramatic content

### TTS Speed and Storyboard Pacing (语速与节奏对应)

When generating TTS, read the corresponding shot's `pacing` field from the storyboard to determine speed:

| Pacing | TTS Speed | Description |
|--------|-----------|-------------|
| `slow` | 1.0 | 放慢语速，营造沉浸感和情感重量 |
| `medium` | 1.2 | 默认语速，自然叙述节奏（不变） |
| `fast` | 1.3 | 加快语速，营造紧迫感和兴奋感 |
| `pause` | N/A | 呼吸段（breathing shot），无旁白，不生成 TTS |

**Rules:**
- If the storyboard does not specify pacing for a shot, default to `medium` (speed 1.2)
- For `pause` pacing shots, skip TTS generation entirely — these are breathing shots with no voiceover
- The pacing value is per-shot; different VO segments in the same video may have different speeds
- After applying pacing-based speed, duration extraction must reflect the actual playback length at that speed

---

## Duration Extraction

Extract audio durations for timing synchronization. **This step is mandatory.**

### Output Format (durations.json)

```json
{
  "VO_001": 3450,
  "VO_002": 2800,
  "VO_003": 4200,
  "VO_004": 3100
}
```

All durations are in **milliseconds**. This file is critical for shot timing in Remotion.

### Duration Rules

- All values MUST be in milliseconds (integer)
- Every `[VO_XXX]` marker in script.md must have a corresponding entry
- Duration reflects the actual audio length at the configured speed (e.g., 1.2x)
- **Always re-extract durations after any audio modification**

### durations.json and Audio-Visual Relation

The `durations.json` format itself remains unchanged (simple `VO_XXX: milliseconds` mapping). However, the Builder's `timing.ts` module uses the storyboard's `audio_visual_relation` field in combination with durations to calculate actual audio start frames:

| `audio_visual_relation` | Builder Behavior |
|------------------------|------------------|
| `sync` | Audio starts at the same frame as the visual shot |
| `lead-visual` | Visual appears slightly before audio (audio offset positive) |
| `lead-audio` | Audio starts slightly before the visual cut (audio offset negative) |
| `counterpoint` | Audio timing is sync, but visual content is intentionally mismatched |

The `audioOffsetFrames` function in `timing.ts` reads these values to apply frame-level offsets. The Audio agent does **not** need to modify durations.json for this — it is handled downstream by the Builder.

> **重要依赖说明**：虽然 durations.json 格式简单（VO_XXX: 毫秒数），但 Builder 在计算实际音频起始帧时，会同时读取 storyboard.yaml 中对应 shot 的 `audio_visual_relation` 字段。Audio agent 只需确保 durations.json 中的时长准确；偏移量由 Builder 的 `timing.ts` → `audioOffsetFrames()` 函数自动计算。

---

## BGM and SFX Retrieval

Download royalty-free audio from Freesound.

### BGM Search Strategy

- Search for loops or long-form tracks matching the video mood
- Minimum duration: 60 seconds (to cover full video length)
- Keywords should describe mood, genre, and instrumentation

### BGM Rhythm Matching (BGM 节奏匹配)

Select BGM tempo based on the dominant `pacing` of each chapter/section in the storyboard:

| Chapter Pacing | BPM Range | Genre / Style |
|---------------|-----------|---------------|
| `slow` | 60-80 BPM | ambient, piano, soft strings, lo-fi |
| `medium` | 90-110 BPM | corporate, light electronic, acoustic |
| `fast` | 120-140 BPM | upbeat electronic, driving percussion, energetic |
| `breathing` shot | N/A | 环境音/氛围音，或与前后章节 BGM 的淡入淡出衔接 |

**Rules:**
- Determine a chapter's dominant pacing by the most frequent pacing value among its shots
- If a video has distinct chapters with different pacing, consider using multiple BGM tracks with crossfade transitions
- For breathing shots between chapters, use ambient/atmospheric sounds or fade the BGM to bridge the transition
- When searching Freesound, include BPM range in keywords (e.g., "ambient piano 70bpm", "upbeat electronic 130bpm")
- BGM should complement, not compete with, the voiceover. Lower BPM tracks naturally sit better under narration.

### SFX Search Strategy

- Search for short, punchy sound effects for transitions and UI feedback
- Maximum duration: typically 3-5 seconds
- Keywords should describe the exact sound needed

### Search Keywords Tips

| Need | Keywords |
|------|----------|
| BGM - Tech | `ambient electronic`, `minimal background`, `corporate` |
| BGM - Emotional | `piano emotional`, `cinematic orchestra`, `inspiring` |
| SFX - Transitions | `whoosh`, `swish`, `swoosh`, `transition` |
| SFX - UI | `notification`, `alert`, `click`, `pop` |
| SFX - Success | `success`, `complete`, `achievement`, `ding` |

### License Information

| License | Attribution | Commercial Use |
|---------|-------------|----------------|
| CC0 (Public Domain) | Not required | Yes |
| CC-BY (Attribution) | Required | Yes |

For CC-BY sounds, record attribution in `raws/audio/LICENSES.txt`.

---

## Output Structure

```
raws/
  audio/
    vo/
      VO_001.wav
      VO_002.wav
      ...
      durations.json       # Critical timing data
    bgm/
      ambient_loop.mp3
    sfx/
      whoosh.mp3
      notification.mp3
    LICENSES.txt           # Attribution for CC-BY sounds
```

---

## Workflow

1. **Generate Voiceovers**
   - Process manifests/script.md for all [VO_XXX] markers
   - All [VO_XXX] markers become VO_XXX.wav files
   - Extract durations to create durations.json

2. **Retrieve BGM**
   - Search for appropriate background music
   - Download to raws/audio/bgm/

3. **Retrieve SFX**
   - Search for transition sounds, UI sounds
   - Download to raws/audio/sfx/

4. **Verify and Report**
   - Check all files generated correctly
   - Report results to user

---

## Incremental Mode

当 dispatch context 中 mode: "incremental" 时：

### 输入
- amendment.affected_resources 中指定的 VO 段落 ID 列表（需要重新生成的语音片段）

### 执行规则
1. 读取 script.md，仅定位指定的 VO 段落
2. 仅对指定的 VO 段落重新生成 TTS 音频
3. 使用与原始生成相同的 character、tone、speed 配置
4. 替换 raws/audio/vo/ 中对应的 WAV 文件
5. **必须重新提取完整的 durations.json**（因为任何音频变化都会影响时序）
6. 返回处理摘要（重新生成了哪些 VO、新旧时长对比）

### 不执行
- 不重新生成未指定的 VO 音频
- 不重新检索 BGM/SFX（除非 amendment 中明确要求）

### 关键注意
- 即使只修改了一个 VO 片段，也必须重新提取整个 durations.json
- 时长变化可能影响下游的 Remotion 时序计算

---

## Audio Timing Rules

These rules are critical for correct Remotion synchronization:

| Rule | Detail |
|------|--------|
| Unit | All durations in **milliseconds** |
| Speed factor | Default 1.2x recommended; durations reflect actual playback length |
| Re-extraction | Mandatory after ANY audio file change |
| Completeness | Every [VO_XXX] in script.md must have a durations.json entry |
| Integer values | No floating point; round to nearest millisecond |

---

## Network Requirements

Edge TTS requires outbound internet access and the Python package `edge-tts`.

---

## User Communication

### Progress Report

```
音频素材生成进行中...

TTS 生成:
  进度: 15/45 条语音
  当前: VO_016
  音色: zh-CN-XiaoxiaoNeural
```

### Completion Report

```
音频素材生成完成。

语音配音:
  - 45 条语音文件
  - 总时长: 4分23秒
  - 音色: zh-CN-XiaoxiaoNeural
  - 时长数据: raws/audio/vo/durations.json

背景音乐:
  - 1 个循环音频 (2分30秒)

音效:
  - 3 个过渡音效
  - 2 个提示音

输出目录: raws/audio/
请确认后继续下一步。
```

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| TTS timeout | Text too long | Split into shorter segments (max 200 chars) |
| Missing durations | Duration extraction not run | Run extraction after TTS generation |
| Audio quality poor | Wrong Edge voice for content | Try a different Edge voice ID |
| Freesound API error | Missing API key | Set FREESOUND_API_KEY |
| Network error | Internet unavailable or Edge TTS request failed | Check internet access and retry |

---

## Critical Notes

### Duration File

`durations.json` is **mandatory** for Remotion implementation. It contains timing data in milliseconds that drives:
- Shot duration calculations
- Audio layer positioning
- Voiceover synchronization

**Always re-extract durations after any audio modification.**

### Default Voice Speed

The default TTS voice may sound slow. Consider using speed `1.2` for more natural pacing. When the storyboard provides a `pacing` field, use the TTS Speed and Storyboard Pacing table above to determine the appropriate speed for each VO segment.
