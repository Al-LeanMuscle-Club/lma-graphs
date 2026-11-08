# Agent Controller 改造：实施对照报告

日期：2026-11-08，补齐版。基线：`main`，提交 `8c0745a19c40aa7673b28ceeb1b49c7ae2850d78`。结果分支：`codex/agent-controlled-rewrite`。

依据：[改造设计报告 v1.1](https://al-leanmuscle-club.github.io/lma-graphs/nanolize-controller-rea-design-20261108/)。当前仓库名称是 `Al-LeanMuscle-Club/nanolize`。

核心改造已经落地：新任务的中间策略由 agent 选择，工具负责执行、记录和事实验收。保留 Discover、Select Scope 和 Deliver 的产品形式。Graphify 仍是结构图来源，agent 使用 nanolize 的完整私有行为知识包；没有引入 Understanding Anything。

原先部分完成的 M12、M04、M09 已按顺序补齐。表中的“已完成”指所列实现与验证工作完成，不表示真实重构全部成功或策略成本优于 main；实验结果和适用边界单独列出。

## M01–M12 逐项对照

| 编号 | 实施状态 | 实际实现与边界 |
| --- | --- | --- |
| M01 Controller 替代中间固定策略 | 已完成 | 新提交默认记录 `engine=agent-controller-v1`，worker 进入 Controller。Agent 选择基线、重构、验证、修复、恢复、继续或交付。原有 Submit、worktree、Local/Slurm、取消和预算入口保留。 |
| M02 提取共用工具 | 已完成 | 33 个可组合操作，通过 CLI `control` 与 MCP `controller_operation` / `controller_state` 共用核心。包含工作区、契约、环境准备、候选、检查、覆盖、代码度量、性能检查、任务评测和管理。行为比较保留“执行检查并比较”的显式组合语义，不隐式修复。 |
| M03 去掉默认隐式修复 | 已完成 | CLI 的 `verify`、`scope-verify`、`verify-bundle`、`report` 及对应 MCP 默认只验证或渲染。只有 `--repair` / `auto_repair=True` 才进入显式修复组合。基线捕获也不再隐式执行环境准备。 |
| M04 契约、检查、环境可修订 | 已完成 | 增加静态修订请求与独立 owner 授权入口，可在同一任务追加检查、替换完整知识。原配置、范围与预算不变；授权链、契约与环境版本绑定证据，历史验证不会复用。支持暂停/授权/恢复、知识更新的中断恢复以及旧候选接收当前知识。 |
| M05 严格标准成为可调用工具 | 已完成 | `evaluate_acceptance` 提供 behavior / delivery 标准，返回通过、缺口和实际失败，不选择下一步。覆盖审计可单独调用；不足不再阻止新 Submit。最终交付仍诚实保留缺口，发布权限和事实标准不因 agent 决策而绕过。 |
| M06 Agent 决定修复、优化与停止 | 已完成 | 修复、优化、恢复和交付均为显式操作。没有工具因检查失败自动再次调用 author。保留总期限、runner 超时、显式 author 上限、优化上限和取消。 |
| M07 拆分任务评测 | 已完成 | 独立设计、保存 suite、执行一次 solver、延后独立评分、比较已评分配对观测；已有完整重复评测保留为可选组合。隐藏验收在 solver 完成后才进入评分工作区。关闭评测会拒绝所有相关入口。不同 suite/试验共享 owner 的已观测 token 总预算。单次配对不冒充完整成本改善结论。 |
| M08 显式候选管理 | 已完成 | 保存候选、按指定文件合并候选部分、恢复及带理由选择候选。不会自动选择 tokens 最少的版本。合并拒绝路径越界、重复文件和 oracle 冲突；恢复后旧观测不自动成为当前验证。 |
| M09 批量、异步与并发 | 已完成 | 增加独立实现工作区、受 owner 上限控制的并行会话、独立回执及草稿归档。一批请求共享 author/optimization 预算，失败保留成功分支；显式按文件合并后重新验证。实际子进程重叠与按身份取消已验证。同一验证候选仍串行，不包含自动跨节点分配。 |
| M10 持久状态与恢复 | 已完成 | 状态按操作、不可覆盖的产物、契约、候选、环境版本和未知项组织；request ID 幂等。恢复检查原仓库、候选资源、实现控制输入及证据摘要。中断的 Controller 调用和 author 草稿保留，不冒充完成。历史记录可读；旧工具契约不匹配时仍需原版本运行时恢复。 |
| M11 前端进度与忠实交付 | 已完成 | 沿用现有图和范围选择，显示真实工具活动。交付区分成功、失败与带缺口完成；图报告增加 Controller 决策数、author 次数、未决问题和独立开销，缺少 usage 保持 unknown。私有 prompts、argv、路径和原始输出不进入这些公开摘要。 |
| M12 提示词、文档、接口与验证 | 已完成 | 完成冻结版本的同模型/预算真实对照：iniconfig、注入基线失败、Detectron2 NMS 模块与新编译 CUDA 支持。保留失败及额外开销；修复由实测发现的工具参数 schema、合法检查名及证据引用说明，并完成真实模型决策回放。测试完成不表示所有目标通过或新策略胜出。 |

## 主要代码位置

- [controller.py](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/controller.py)：策略调用协议、33 个操作、产物/候选/环境版本、恢复和交付。
- [execution.py](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/execution.py)：新默认入口以及现有作业生命周期。
- [Controller 提示词](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/prompts/controller/guide.md)：可选策略指导，不规定固定阶段顺序。
- [effort.py](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/effort.py)：solver 与延后评分的独立执行、原有完整评测组合。
- [CLI](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/cli_workflow.py)、[MCP](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/mcp_server.py)、[操作身份](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/operations.py)：统一调用及权限/副作用声明。
- [进度前端](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/assets/execution.js)、[图报告](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/assets/report.js)、[报告投影](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/report_site.py)：实际活动与经过筛选的开销信息。
- [操作指南](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/docs/agent-controller.md)：参数、示例、并发边界和迁移说明。

## 原版实施验收（历史记录）

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

本次按 M12 → M04 → M09 补齐原先的三项缺口。下面列出新增功能、实际实验和当前版本验收；上面的 821 项 / 34 工具数据属于前一提交的历史验收，不能当作新版本的测试数量。

## 补齐 1：M12 真实模型、编译与 GPU 对照

先冻结两套运行时，后续功能修改不影响对照：原 main `8c0745a19c40aa7673b28ceeb1b49c7ae2850d78`，首次 Controller `5d86654a900b8f75255e365ee22b9fafff7c4cf4`。每场同模型 `gpt-6.1-sol`、同 `xhigh` 推理设置、同语义输入与检查，job 1,200 秒、单次 runner 420 秒、最多 2 次实现调用、0 次优化，关闭任务评测。

| 场景 | 流程 | 实际结果 | 作业时间（秒） | 总模型 tokens | 缓存输入 tokens | 模型调用（控制 / 实现） |
| --- | --- | --- | ---: | ---: | ---: | --- |
| iniconfig 全 Python 包 | main | 失败：原版测试收集错误；输出检查通过 | 442.75 | 296,455 | 247,040 | 0 / 2 |
| iniconfig 全 Python 包 | Controller | 失败：同一收集错误；输出检查通过 | 580.69 | 553,577 | 450,688 | 4 / 1 |
| iniconfig + 人为基线失败 | main | 失败：在基线阶段停止，未调用模型 | 6.24 | 0（确实没有模型调用） | 0 | 0 / 0 |
| iniconfig + 人为基线失败 | Controller | 失败：继续生成候选，保留基线与候选失败 | 589.58 | 510,324 | 420,864 | 3 / 1 |
| Detectron2 NMS 适配模块 | main | 带缺口交付：功能检查通过，未配置安装 | 164.28 | 139,504 | 116,096 | 0 / 1 |
| Detectron2 NMS 适配模块 | Controller | 带缺口交付：功能检查通过，未配置安装 | 395.20 | 460,026 | 378,496 | 3 / 1 |

时间从作业队列事件到终态，GPU 对照不计随后独立复查；不是整次 Slurm 分配时间。总 tokens 为模型事件的输入与输出之和，包含缓存输入，缓存并非额外相加；推理输出已经包含在输出内。没有按价格折算费用，未把无 usage 当成 0。每场每流程仅一次，执行顺序没有随机化，不能估计通用成功率或统计显著性。

**结果不能支持“更快、更省”。** NMS 场景首次 Controller 作业耗时约为 main 的 2.41 倍，tokens 约 3.30 倍；iniconfig 约为 1.31 倍和 1.87 倍。固定流程在注入的基线故障前立即停止，Controller 继续工作消耗更多，这只能说明控制方式不同，不能算成功提升。

iniconfig 原版提交为 `a9e0ad14bcd0d9d3b68d2b699ce38399cbe64fdd`。原版测试可运行，重写候选都遗漏了 `__all__`，导致原版测试收集失败；交给模型的相同语义说明没有写清这个契约。此处没有把输入知识的缺口归咎于测试，也没有在同一对照中偷偷补充单边输入。安装检查只是全新环境复制包并 import，**不是 wheel 构建验证**。注入场景额外命令主动退出 17，明确是实验注入，不是上游缺陷。

GPU 场景基于 Detectron2 `247691a1c292654867deb35cabb27f18d75a1363`，**只重写完整的 NMS Python 适配模块，不是完整 Detectron2**。Slurm 作业 `8733896` 在 GB200 上完成：实际分配 1 节点 / 4 GPU、64 GB，检查只暴露并使用 1 GPU；作业总分配时长 13 分 08 秒。PyTorch 2.8.0+cu129、CUDA 12.9；重新编译原版 native extension，没有复用旧二进制。未重写 native kernels。

两个流程的原版和候选均通过未改动的 NMS 测试 **9/9**，CPU/CUDA 输出探针通过，30 次重复的单一 CUDA benchmark 完成。main 原版/候选中位时间约 0.715/0.638 ms，Controller 原版/候选约 0.687/0.650 ms；这些只是一个 workload 的观测，不构成全仓性能无回归结论。完整仓库功能、跨节点训练、其他 CUDA 算子不在此次范围。

实测发现首次 Controller 工具说明只列参数名：模型误用 `implementer`、把 `check-1` 当检查名、把自然语言当证据 ID。已补真实签名、必填项/默认值/枚举、已授权检查名，以及同批调用不能猜测尚未返回 ID 的说明。相同初始决策输入的真实模型回放通过参数及引用检查：56.94 秒、127,567 tokens，其中缓存输入 109,056。**这次是决策回放，没有再次执行目标实现或行为验收**，不能把它当成修正后 A/B 成功结果。

## 补齐 2：M04 同一任务内授权修订

- 新增 `request_revision`：agent 提议追加检查或替换完整知识，仅作静态校验；`wait=True` 保存并暂停 worker，不消耗资源空转。
- 新增独立 CLI `control-authorize` 和 MCP `authorize_controller_revision`：只有 owner 明确授予，且 `expected_revision` 匹配时生效。请求 ID 可用于精确核对；它不出现在自主 Controller 工具箱里。
- 行为、准备、候选和安装检查只能追加。禁止用同名定义替换旧检查，诊断子集也不能减弱原始或新增验收。安装仍要求新环境的 `{python}`。
- 原配置不改写，授权以不可覆盖产物串成链，校验 job、owner、来源与父版本；源码范围、预算、发布权限不借修订扩张。授权本身执行 0 条命令。
- 新授权更新契约和环境版本，清除当前选定状态；旧基线、验证、任务试验/评分保留历史，不可成为当前通过凭证。
- 完整知识通过原格式与来源绑定验证。已有生成代码保留，更新输入使用 staging/backup 与持久重命名日志；恢复旧候选时也装入当前知识。9 项专项测试覆盖授权拒绝、匹配冲突、旧证据失效、知识更新、中断恢复、暂停/恢复、实际 worker 退出、取消及 CLI/MCP。
- 等待 owner 不自动增加总期限；已过期任务需要新的授权运行。公开进度不包含私有 argv、知识或路径。协议和目录约束仍不是 OS 沙箱。

代码：[controller_revisions.py](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/controller_revisions.py)。调用说明见[使用指南](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/docs/agent-controller.md)。

## 补齐 3：M09 独立实现工作区与并行执行

新增 `create_implementation_workspace`、`run_workspace_agents`、`get_workspace_status`、`save_workspace_candidate`。可以从空目录开始，或仅以保存过的生成代码为种子；每份独立 Git 仓库只得到当前知识及自己的草稿。

Owner 的 `max_parallel_agents` 默认 2、范围 1–8；旧配置缺项使用 1。单批最多 20 项，启动前预留全部 author/optimization 次数，评审也计数，中断不退回预算，不能利用并行绕过总限额。每个会话有独立日志与进程回执；成功、失败和中断都保留，不自动选最短实现，也不自动合并。

真实子进程测试验证了时间区间重叠、后台查询、按身份取消、不杀无关进程、一个失败仍可保存其他草稿、评审写入不得报成功、授权并发上限、汇总预算、过期知识拒绝、显式合并和重新对照。8 项专项测试通过。损坏控制输入的目录不能归档，但不妨碍其他完整目录归档。

合并仍按显式、互不重叠的文件进行，不自动解决同文件冲突；合并完成后需新验证。同一验证候选的修改/证据操作串行，而多个实现目录并发。继承既有 Local/Slurm 资源，**不包含自动为每个子会话申请不同节点**。更新知识后，可以把旧目录保存为草稿，再建立使用当前知识的新目录。

代码：[controller_workspaces.py](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/src/nanolize/controller_workspaces.py)。Controller 共 **33** 个可组合操作，安装包共 **35** 个 MCP 工具；这两个数量的范围不同。

## 当前版本验证与范围

1. Python 当前 **841 个唯一用例 / 76 个模块通过**：执行要求的完整 `unittest discover`（840 项），最后对新增暂停 worker 检查与公开旧摘要清理修复复测运行内修订模块（9 项）；重复执行不重复计数。新增覆盖包括工具参数协议 3 项、运行内修订 9 项、并行工作区 8 项。
2. JavaScript 受影响进度/报告 **40 项通过**，包括暂停状态、owner 授权后继续观察并显示可恢复，不自动创建或恢复任务。
3. `examples/run_demo.py` 通过，正确实现通过，刻意错误实现被识别；`examples/run_graph_rewrite_demo.py` 通过，2 次离线 Controller 决策、1 次实现、3/3 wheel/全新环境安装检查，原仓库与原测试不变。
4. 最终 wheel/插件包以独立环境安装验收，**35 个 MCP 工具齐全**，Controller 内部 33 个操作；源码不依赖 checkout 导入，prompt 与资源均在发行物中。工作流文档同步检查通过。
5. 报告网页已通过 320/390/900/1440 宽度的交互与布局检查：12 项要求、筛选与搜索、流程键盘切换、33 个工具展开、复制、原文和下载链接，无横向溢出或 JavaScript 错误。

发现过的专项问题均保留修复记录：旧验收摘要可能在新授权后继续显示，已清空当前摘要并使旧选择失效；最终修订模块复测通过。没有将目标重构失败混为 harness 通过，也没有删除对照中的失败。全量测试结束时有 3 条子进程回收 ResourceWarning，随后核对相应 PID 均已不存在；未将警告隐藏为“零警告”。

真实模型的新增接口联调已通过：人工选定工具顺序，在合成的双模块文本处理项目中完成静态请求、owner 授权、两个独立模型会话并行、显式合并、2 项行为检查及 3 项 wheel/安装检查，最终 `succeeded`。总计 217.18 秒、3 次实现调用、337,369 tokens。两个初始会话的执行区间实际重叠。

联调脚本在显式 `select_candidate` 前调用 delivery 验收，把唯一的 `candidate_not_selected` 缺口误当成继续实现的理由，因此额外调用了一次实现；当时行为和安装已经通过。该调用的时间和 tokens 全部保留，不归因于自主 Controller 策略，也不把这次合成联调冒充新一轮 A/B。它验证的是新接口与真实模型能协同运行。

实验数据的公开、去私有信息摘要：[controller-experiments.json](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/docs/controller-experiments.json)。完整验收摘要：[controller-validation.json](https://github.com/Al-LeanMuscle-Club/nanolize/blob/19793f9e61b42b2aa1f61fe19de9e10b0a8a41fc/docs/controller-validation.json)。原始模型消息、argv、路径、私有检查输出和目标代码副本不公开。

## 如何理解“补齐”

三项交付内容已经有实现和实际验证；这不表示真实重构实验全部成功，也不表示 Controller 的策略已经优于固定流程。此轮优先修补了实测暴露的可用性问题，并提供后续自主诊断、知识补充与并行实现的工具。大型仓库全量重写、多种模型、多次随机对照、自动跨节点会话分配仍不在本次完成声明内。
