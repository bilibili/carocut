---
name: carocut-builder-pipeline
description: Remotion 资产管道。调用 project_migrate tool 将 raws/ 素材迁移到 template-project/public/ 并生成 resourceMap.ts、constants.ts、timing.ts。Agent 只需 edit constants.ts 中的 COLORS 和 FONTS。
---

# Asset Pipeline

素材迁移 + TypeScript 文件生成。连接策划产出物和 Remotion 实现代码。

## Incremental Mode

增量模式下素材只增不删。`resourceMap.ts` 全量重新生成以反映完整素材集。`constants.ts` 仅在风格/配色变更时修改。

---

## Inputs

| Source | Content |
|--------|---------|
| `raws/images/` | All visual assets |
| `raws/audio/` | VO, BGM, SFX files |
| `raws/videos/` | Video clips (mp4, webm, mov) |
| `manifests/resources.yaml` | Resource definitions |
| `raws/audio/vo/durations.json` | VO timing data |
| `manifests/memo.md` | Color and style preferences |

## Outputs

| Target | Content |
|--------|---------|
| `template-project/public/` | Copied image/audio/video assets |
| `template-project/src/lib/resourceMap.ts` | Asset path constants, VO_DURATIONS |
| `template-project/src/lib/constants.ts` | VIDEO_CONFIG, COLORS, FONTS, PACING, TENSION_CONFIG |
| `template-project/src/lib/timing.ts` | Frame calculation + pacing/tension/audio-offset utilities |

---

## Step 6 流程

### 6.1 调用 `project_migrate` tool

脚本自动完成：
- 复制 `raws/` → `template-project/public/`（跳过 .json/.yaml/.md 等非素材文件）
- 生成 `resourceMap.ts`（扫描实际文件 + durations.json）
- 生成 `constants.ts`（含默认 COLORS/FONTS，需 Agent 替换）
- 生成 `timing.ts`（完整工具函数，无需修改）

### 6.2 Agent edit constants.ts

脚本生成的 `constants.ts` 中 COLORS 和 FONTS 是默认值。Agent 必须：

1. 读取 `manifests/memo.md` 中的视觉风格决策
2. Edit `constants.ts` 中的 `COLORS` 对象 — 替换为 memo.md 指定的配色
3. Edit `constants.ts` 中的 `FONTS` 对象 — 替换为 memo.md 指定的字体
4. 如 `decisions_summary` 指定了非默认分辨率/FPS，edit `VIDEO_CONFIG`

其他常量（FONT_SIZES、PACING、TENSION_CONFIG）为固定值，无需修改。

### 6.3 验证

```bash
cd template-project
npx tsc --noEmit
```

---

## Verification Checks

- [ ] All assets copied to public/
- [ ] resourceMap.ts has no TypeScript errors
- [ ] VO_DURATIONS has entry for every VO file
- [ ] COLORS matches memo.md preferences
- [ ] All staticFile() paths are valid

---

## Manual Asset Copy (if `project_migrate` tool fails)

```bash
cp -r raws/images/existing/* template-project/public/images/existing/
cp -r raws/images/retrieved/* template-project/public/images/retrieved/
cp -r raws/images/generated/* template-project/public/images/generated/
cp -r raws/audio/* template-project/public/audio/
[ -d raws/videos ] && cp -r raws/videos/* template-project/public/videos/
[ -d raws/video ] && cp -r raws/video/* template-project/public/video/
```

---

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Missing VO file | TTS generation incomplete | Re-run TTS generation |
| Path mismatch | resources.yaml path wrong | Update path in resources.yaml |
| Type error in resourceMap | Invalid character in key | Use valid TypeScript identifier |
| durations.json missing | extract_durations not run | Run extract_durations.py |
