# Agent Controller 改造：实施对照报告

日期：2026-11-08。基线：`main`，提交 `8c0745a19c40aa7673b28ceeb1b49c7ae2850d78`。结果分支：`codex/agent-controlled-rewrite`。

依据：[改造设计报告 v1.1](https://al-leanmuscle-club.github.io/lma-graphs/nanolize-controller-rea-design-20261108/)。当前仓库名称是 `Al-LeanMuscle-Club/nanolize`。

核心改造已经落地：新任务的中间策略由 agent 选择，工具负责执行、记录和事实验收。保留 Discover、Select Scope 和 Deliver 的产品形式。Graphify 仍是结构图来源，agent 使用 nanolize 的完整私有行为知识包；没有引入 Understanding Anything。

本次没有把设计报告的全部建议都标为完成。M04、M09、M12 有明确边界，见下表。

## M01–M12 逐项对照

| 编号 | 实施状态 | 实际实现与边界 |
| --- | --- | --- |
| M01 Controller 替代中间固定策略 | 已完成 | 新提交默认记录 `engine=agent-controller-v1`，worker 进入 Controller。Agent 选择基线、重构、验证、修复、恢复、继续或交付。原有 Submit、worktree、Local/Slurm、取消和预算入口保留。 |
| M02 提取共用工具 | 已完成 | 28 个可组合操作，通过 CLI `control` 与 MCP `controller_operation` / `controller_state` 共用核心。包含工作区、契约、环境准备、候选、检查、覆盖、代码度量、性能检查、任务评测和管理。行为比较保留“执行检查并比较”的显式组合语义，不隐式修复。 |
| M03 去掉默认隐式修复 | 已完成 | CLI 的 `verify`、`scope-verify`、`verify-bundle`、`report` 及对应 MCP 默认只验证或渲染。只有 `--repair` / `auto_repair=True` 才进入显式修复组合。基线捕获也不再隐式执行环境准备。 |
| M04 契约、检查、环境可修订 | 部分完成 | 保存契约父版本、原因、语义/环境说明和历史证据；允许选择 owner 已授权检查的诊断子集。环境准备是独立工具，推进环境版本，旧基线、验证及任务证据不能自动沿用。原始功能和交付检查要求不随子集缩减。尚未提供在同一运行中新增授权 argv、替换完整知识包的授权修订接口；目前需要重新配置运行。 |
| M05 严格标准成为可调用工具 | 已完成 | `evaluate_acceptance` 提供 behavior / delivery 标准，返回通过、缺口和实际失败，不选择下一步。覆盖审计可单独调用；不足不再阻止新 Submit。最终交付仍诚实保留缺口，发布权限和事实标准不因 agent 决策而绕过。 |
| M06 Agent 决定修复、优化与停止 | 已完成 | 修复、优化、恢复和交付均为显式操作。没有工具因检查失败自动再次调用 author。保留总期限、runner 超时、显式 author 上限、优化上限和取消。 |
| M07 拆分任务评测 | 已完成 | 独立设计、保存 suite、执行一次 solver、延后独立评分、比较已评分配对观测；已有完整重复评测保留为可选组合。隐藏验收在 solver 完成后才进入评分工作区。关闭评测会拒绝所有相关入口。不同 suite/试验共享 owner 的已观测 token 总预算。单次配对不冒充完整成本改善结论。 |
| M08 显式候选管理 | 已完成 | 保存候选、按指定文件合并候选部分、恢复及带理由选择候选。不会自动选择 tokens 最少的版本。合并拒绝路径越界、重复文件和 oracle 冲突；恢复后旧观测不自动成为当前验证。 |
| M09 批量、异步与并发 | 部分完成 | 支持一轮多个调用、后台操作 ID、查询、取消及既有 Local/Slurm 作业管理；任务评测继续复用已有并发实现。同一候选工作区操作串行，尚未实现一个 job 内多个实现工作区的并行 agent 分工与调度。 |
| M10 持久状态与恢复 | 已完成 | 状态按操作、不可覆盖的产物、契约、候选、环境版本和未知项组织；request ID 幂等。恢复检查原仓库、候选资源、实现控制输入及证据摘要。中断的 Controller 调用和 author 草稿保留，不冒充完成。历史记录可读；旧工具契约不匹配时仍需原版本运行时恢复。 |
| M11 前端进度与忠实交付 | 已完成 | 沿用现有图和范围选择，显示真实工具活动。交付区分成功、失败与带缺口完成；图报告增加 Controller 决策数、author 次数、未决问题和独立开销，缺少 usage 保持 unknown。私有 prompts、argv、路径和原始输出不进入这些公开摘要。 |
| M12 提示词、文档、接口与验证 | 部分完成 | 新增独立 Controller prompt、操作指南、API/CLI、回归测试、更新离线端到端示例和打包验收。尚未执行真实模型在相同预算下的前后对照，也未做新的编译/GPU 大型仓库实测，因此不能宣称成功率、速度或成本优于旧流程。 |

## 主要代码位置

- [controller.py](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/src/nanolize/controller.py)：策略调用协议、28 个操作、产物/候选/环境版本、恢复和交付。
- [execution.py](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/src/nanolize/execution.py)：新默认入口以及现有作业生命周期。
- [Controller 提示词](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/src/nanolize/prompts/controller/guide.md)：可选策略指导，不规定固定阶段顺序。
- [effort.py](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/src/nanolize/effort.py)：solver 与延后评分的独立执行、原有完整评测组合。
- [CLI](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/src/nanolize/cli_workflow.py)、[MCP](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/src/nanolize/mcp_server.py)、[操作身份](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/src/nanolize/operations.py)：统一调用及权限/副作用声明。
- [进度前端](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/src/nanolize/assets/execution.js)、[图报告](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/src/nanolize/assets/report.js)、[报告投影](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/src/nanolize/report_site.py)：实际活动与经过筛选的开销信息。
- [操作指南](https://github.com/Al-LeanMuscle-Club/nanolize/blob/5d86654a900b8f75255e365ee22b9fafff7c4cf4/docs/agent-controller.md)：参数、示例、并发边界和迁移说明。

## 验证结果

1. Python：覆盖全部 **73 个测试模块、821 个当前用例**，以逐模块全量执行及变更项复测完成验收。新增 Controller/延后评分测试共 **17 个**。覆盖基线失败仍能继续、没有检查映射、关闭评测、owner 授权、幂等冲突、取消和恢复、契约/环境变化、候选恢复、资源篡改、预算累计和有缺口交付。
2. JavaScript：受影响的进度与报告测试 **33 项通过**。
3. 必需基础示例：`examples/run_demo.py` 通过，正确实现通过，刻意错误实现被识别为回归。
4. 新默认流程端到端：`examples/run_graph_rewrite_demo.py` 通过。固定离线 runner 经过 **2 次 Controller 决策、1 次实现调用**，完成原版对照、构建 wheel、全新环境安装和安装后行为检查；**3/3 安装检查通过**，原仓库和原测试未变，生成图报告，结果为 `succeeded`。
5. 分发：wheel 和插件包在新的隔离环境安装后验收通过，包含新 prompt、操作文档以及 **34 个 MCP 工具**。工具描述与 28 个内部 callable 的参数一致；工作流文档同步检查及 diff 格式检查通过。

首轮完整单进程测试暴露了旧测试对“固定 runner 协议、默认自动修复、32 个工具和 Submit 前覆盖门槛”的依赖。它们已按新行为调整；旧运行兼容路径仍有独立回归覆盖。最后的模块验收另发现一处同类工具数量断言，更新后复测通过。没有把失败项跳过或当作通过。

这些测试是 harness、协议、进程和固定案例的验证。离线 runner 与合成任务不构成真实 agent 能力评测；安装检查也不代表所有目标仓库、CUDA 功能或 Slurm 硬件环境已经验证。

## 使用与迁移

```bash
# 查看已授权运行的状态与工具清单
nanolize control /private/state/jobs/JOB_ID --json

# 明确执行一个工具；相同 ID 不重复执行
nanolize control /private/state/jobs/JOB_ID capture_baseline \
  --request-id baseline-v1 --allow-execution --json

# 原有独立验证默认只产生证据；需要修复时显式 opt in
nanolize scope-verify /path/to/candidate --baseline baseline.json \
  --allow-execution --repair --json
```

默认 Codex runner 接收新的 Controller 指导。自定义 `--runner` 需要同时理解控制调用与实现调用：控制工作区有 `context.json`、`knowledge/`，应输出 `decision.json`；实现调用继续使用 `.nanolize-rewrite`。旧的纯代码写入脚本不能直接作为新 Controller runner，示例和 HTTP 测试已演示适配方式。

保留 main 的 source-free 实现边界，不自动扩大源码访问权限。工具只执行 owner 提供的已授权 argv。目录隔离和摘要校验不等于对恶意代码的 OS 沙箱。

下一步应优先完成运行内授权修订与独立实现工作区，再用同模型、同预算、同任务比较旧流程和 Controller，分别报告总 tokens、时间、成功率、无效重试和未验证项。没有这些实验前，不能把“更灵活”写成“已经更快”。
