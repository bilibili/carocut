---
description: 启动视频制作工作流
---

请切换到 carocut-orchestrator agent，开始视频制作工作流。
检查当前项目是否存在 manifests/progress.yaml：
- 如果存在，读取进度状态，从断点恢复
- 如果不存在，确认用户提供的素材路径，从 step-0 开始
