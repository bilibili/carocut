---
name: carocut-shared-schema
description: 所有 agent 共享的协议定义。包含资源类型注册表、storyboard schema、dispatch context schema、amendment action 类型。Planner 写入时遵守、Media 处理时校验、Builder 实现时参考、Orchestrator 调度时构造。
---

# Shared Schema

所有 agent 共享的 Single Source of Truth。按需查阅 `references/` 下的详细定义。

| Schema | 文件 | 用途 |
|--------|------|------|
| Resource Types | `references/resource-types.md` | resources.yaml 的类型注册表、source 值规范、消费者映射、能力边界 |
| Storyboard | `references/storyboard-schema.md` | storyboard.yaml 完整字段定义、视觉语言参考、visual description 规范 |
| Dispatch Context | `references/dispatch-context.md` | orchestrator ↔ subagent 通讯协议（full/resume/incremental 模式） |
| Amendment Map | `references/amendment-map.md` | 增量修改的 action 类型和影响链（orchestrator 查表用） |
