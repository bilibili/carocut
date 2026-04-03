# Amendment Dependency Map

用户请求修改时，根据变更类型查找需要重新执行的步骤链。

Orchestrator 按影响链顺序逐个调度 subagent，每个步骤使用 `mode: "incremental"`。

以下 action 类型对应 dispatch-context.md 中 `amendment.type` 字段的合法值：

```yaml
amendment_dependencies:
  add_visual_asset:
    - { step: 4, action: "获取指定的新素材" }
    - { step: 6, action: "迁移新素材，更新 resourceMap.ts" }
    - { step: 7, action: "修改受影响的 shot 组件" }

  modify_script_segment:
    - { step: 3, action: "仅对修改段落去 AI 味" }
    - { step: 5, action: "重新生成受影响的 VO" }
    - { step: 6, action: "迁移新 VO，更新 resourceMap" }
    - { step: 7, action: "更新受影响 shot 的帧时序" }

  add_new_shot:
    - { step: 2, action: "storyboard.yaml 追加 shot" }
    - { step: 4, action: "获取新 shot 所需视觉素材" }
    - { step: 5, action: "生成新 shot 的 VO" }
    - { step: 6, action: "迁移新素材，更新 resourceMap" }
    - { step: 7, action: "实现新 shot 组件" }

  change_style:
    - { step: 6, action: "更新 constants.ts 配色和字体" }
    - { step: 7, action: "扫描所有 shot，更新硬编码值" }

  replace_bgm:
    - { step: 5, action: "获取新 BGM" }
    - { step: 6, action: "迁移新 BGM，更新 resourceMap" }
    - { step: 7, action: "更新 BackgroundMusicLayer" }

  adjust_cinematography:
    - { step: 6, action: "更新运镜/景别/转场参数" }
    - { step: 7, action: "重新编排受影响 shot 的 primitives 和动画" }

  modify_pacing:
    - { step: 2, action: "更新 storyboard 中的节奏结构和呼吸段" }
    - { step: 6, action: "更新 timing.ts 中的节奏参数" }
    - { step: 7, action: "重新编排 shot 时长和转场节奏" }

  add_breathing_space:
    - { step: 2, action: "在 storyboard 中插入 breathing 段落" }
    - { step: 6, action: "更新 timing.ts 和 resourceMap" }
    - { step: 7, action: "实现 BreathingSpace 组件并调整时序" }

  change_camera_movement:
    - { step: 7, action: "修改受影响 shot 的 KenBurns/运镜参数" }

  add_video_asset:
    - { step: 4, action: "获取指定的视频素材" }
    - { step: 6, action: "迁移视频素材，更新 resourceMap" }
    - { step: 7, action: "使用 VideoClip primitive 实现视频 shot" }

  adjust_tension_curve:
    - { step: 2, action: "调整 storyboard 中的 visual_tension 曲线" }
    - { step: 7, action: "根据新的张力曲线调整 shot 节奏和视觉强度" }
```

如果用户请求不匹配以上任何类型，根据步骤间的依赖关系自行推理影响范围。
