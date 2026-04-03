# Dispatch Context Schema

Orchestrator 调度 subagent 时通过 Task tool message 传递的结构化上下文。

## Full / Resume 模式

```yaml
dispatch_context:
  project_path: "<项目绝对路径>"          # 所有文件操作的基准路径
  mode: "full" | "resume"               # 执行模式
  current_phase: "planning" | "media" | "implementation" | "delivery"
  completed_steps: [1, 2]               # 已完成的步骤编号

  artifacts:                             # 前置产出物相对路径（相对 project_path）
    memo: "manifests/memo.md"
    resources: "manifests/resources.yaml"
    script: "manifests/script.md"
    storyboard: "manifests/storyboard.yaml"
    inventory: "raws/inventory.yaml"
    data_json: "raws/data.json"
    durations: "raws/audio/vo/durations.json"  # 仅 step-6+ 可用

  output_rules: |                        # [CRITICAL] 固定输出路径
    所有文件必须写入以下固定路径：
    - memo: {project_path}/manifests/memo.md
    - resources: {project_path}/manifests/resources.yaml
    - script: {project_path}/manifests/script.md
    - storyboard: {project_path}/manifests/storyboard.yaml
    - VO 音频: {project_path}/raws/audio/vo/
    - BGM: {project_path}/raws/audio/bgm/
    - SFX: {project_path}/raws/audio/sfx/
    - 检索图片: {project_path}/raws/images/retrieved/
    - 生成图片: {project_path}/raws/images/generated/
    - 检索视频: {project_path}/raws/videos/retrieved/
    禁止创建 manifests/ raws/ outputs/ template-project/ 以外的顶级目录。

  decisions_summary: |                   # 从产出物中提取的关键决策
    - 视频时长：3分钟
    - FPS：30
    - 分辨率：1920x1080
    - 总 shot 数：12
    - VO 段落数：8
    - 视觉风格：扁平插画
    - 配色：#0F172A 主色 + #3B82F6 强调色
```

## Incremental 模式（额外字段）

```yaml
dispatch_context:
  mode: "incremental"
  amendment:
    id: "amend_001"
    type: "add_visual_asset"             # amendment action 类型，完整列表见 amendment-map.md
    user_request: "给第三个镜头加一张服务器机房的俯拍图"  # 用户原话，原样传递
    affected_shots: ["shot_03"]
    affected_resources:
      - resource_id: "img_server_room_aerial"
        type: "image"
        search_keywords: "server room aerial view data center"
        target_shot: "shot_03"
  preserve:                              # 保护已有文件
    - "raws/images/retrieved/ 中已有的文件不要删除或覆盖"
    - "raws/images/generated/ 中已有的文件不要删除或覆盖"
  modified_artifacts:                    # 本次 amendment 周期中已修改的产出物
    - "manifests/resources.yaml"
```

## 调度原则

- 传路径不传内容
- 传需求不传实现：只说"做什么"和"产出什么"，不说"怎么做"。subagent 有自己的 skill 来决定实现方式
- 必须包含 `output_rules`，替换 `{project_path}` 为实际项目工作路径
- `decisions_summary` 从产出物中提取
- `amendment.user_request` 必须原样传递用户原话，不添加 orchestrator 自己的判断
