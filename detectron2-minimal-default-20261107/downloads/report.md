# Detectron2 · minimal/lma-core 默认流程报告


> 流程结束，但功能验收未通过。最终候选仅通过 12/23 项检查。
>
> 原版体积统计覆盖完整仓库生产源码，候选只保留默认核心范围。约 96.25% 的字节下降包含功能裁剪，不能理解为全功能等价压缩率。

实验日期：2026-11-06。运行时长：147.7 分钟。未修改分支代码，未覆盖默认运行参数；外部功能清单复用已有 Detectron2 描述。

默认范围为 10/106 个能力节点（其中 4 个为根或分组节点），保留 23 项检查，退役 137 项。CPU 检查没有证明 GPU、完整训练或端到端检测能力等价。包装检查通过也不等于完成全新环境的安装验证。

单次 ImageList padding 修改任务两侧均通过其任务验收，模型 tokens 从 476,442 降到 431,290（-9.477%）。只有一个任务、每侧一次运行，且候选整体功能未通过验收，因此不能外推为普遍收益。

25 次模型调用均记录完整 usage；总计 20,010,121 tokens，包含 18,089,728 个缓存输入 tokens。缓存是输入的子集，不重复相加，也不按同一价格换算费用。

验证适配：分支的临时快照省略 .git；外部检查适配层以原版源码清单和逐文件 SHA-256 相等替代旧检查中的 Git 身份判断，才允许加载冻结的原版原生扩展。原有测试断言、测试/资源/扩展哈希与输出比较保留；候选不能借用该原版扩展。

## 重点
- After 10 repairs, 11 of 23 required checks still fail; the job continued with attempt 10, the one passing the most required checks (12 of 23).

## 状态
- 状态：`completed`
- 保留功能 10 个，移除 96 个；保留检查 23 个，退役检查 137 个
- job：`detectron2-minimal-default-20261106`

## 原版检查
- 通过 23 个（候选必须通过）：CPU behavior: Configuration and object construction, CPU behavior: Image and prediction data structures, CPU behavior: Shared neural-network and tensor operations, CPU behavior: Model construction, matching and output geometry, CPU behavior: Runtime services and interoperability, runtime-build-package, upstream:tests/config/test_instantiate_config.py, upstream:tests/config/test_lazy_config.py, upstream:tests/config/test_yacs_config.py, upstream:tests/layers/test_blocks.py, upstream:tests/layers/test_losses.py, upstream:tests/layers/test_nms.py, upstream:tests/layers/test_roi_align.py, upstream:tests/modeling/test_anchor_generator.py, upstream:tests/modeling/test_box2box_transform.py, upstream:tests/modeling/test_matcher.py, upstream:tests/structures/test_boxes.py, upstream:tests/structures/test_imagelist.py, upstream:tests/structures/test_instances.py, upstream:tests/structures/test_keypoints.py, upstream:tests/structures/test_masks.py, upstream:tests/test_packaging.py::TestCollectEnv, upstream:tests/test_registry.py
- 未通过 0 个（不要求候选通过）：-

## 重写尝试
第 0 次是首次重写，之后每次是一轮修复。

| 次 | commit | 通过 | 未通过 | 冲突文件 | 外部导入 | judge | 接受 |
|---|---|---|---|---|---|---|---|
| 0 | `62d236b53d` | 10/23 | upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_anchor_generator.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/modeling/test_matcher.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_imagelist.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | tools | verify: fail | 否 |
| 1 | `796d462063` | 10/23 | CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_anchor_generator.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_imagelist.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | tools | verify: fail | 否 |
| 2 | `f3f0aec564` | 12/23 | CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | - | verify: fail | 否 |
| 3 | `607edbcada` | 12/23 | CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | - | verify: fail | 否 |
| 4 | `7fa6d8044f` | 12/23 | CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | - | verify: fail | 否 |
| 5 | `0ed11f7514` | 12/23 | CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | - | verify: fail | 否 |
| 6 | `27324441d0` | 12/23 | CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | - | verify: fail | 否 |
| 7 | `e382c7a4ab` | 12/23 | CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | - | verify: fail | 否 |
| 8 | `b072b9d992` | 12/23 | CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | - | verify: fail | 否 |
| 9 | `2b2e4f0f8f` | 12/23 | CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | - | verify: fail | 否 |
| 10 | `772b7bb8d6` | 12/23 | CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed) | 0 | - | verify: fail | 否 |

## 最佳版本
- 第 10 次尝试，commit `772b7bb8d6aa470bbbfdd3d0fa454c52f4db8bf3`，分支 `nanolize/detectron2-minimal-default-20261106`
- 必须通过的检查：11 个未通过：CPU behavior: Image and prediction data structures (output_changed), upstream:tests/config/test_instantiate_config.py (failed), upstream:tests/config/test_lazy_config.py (failed), upstream:tests/config/test_yacs_config.py (failed), upstream:tests/layers/test_blocks.py (failed), upstream:tests/layers/test_nms.py (failed), upstream:tests/layers/test_roi_align.py (failed), upstream:tests/modeling/test_box2box_transform.py (failed), upstream:tests/structures/test_boxes.py (failed), upstream:tests/structures/test_instances.py (failed), upstream:tests/test_registry.py (failed)
- 没有一次尝试被接受；后续步骤使用通过检查最多的这一次
- judge（verify）：fail。Reproduced BoxMode.convert returning [1, 2, 4, 6] on the original and [1.0, 2.0, 4.0, 6.0] on the candidate under the same interpreter. This changes the required stdout comparison and is caused by the candidate forcing float64, not the harness.

## 代码规模
只统计源代码文件（按扩展名；不含测试和依赖文件），原版与候选用同一规则。

| | 文件 | 行 | 字节 |
|---|---|---|---|
| 原版 | 447 | 71189 | 3160245 |
| 候选 | 59 | 2823 | 118630 |
| 候选/原版 | 13% | 4% | 4% |

## 任务成本
- 状态：已比较

| | 运行次数 | 完成任务 | tokens（每次） |
|---|---|---|---|
| 原版 | 1 | 1 | 476442 |
| 候选 | 1 | 1 | 431290 |

- 比较结论：`passed`（候选/原版 = 0.905231，变化 -9.477%）

## Token 用量
| 阶段 | tokens |
|---|---|
| 出题（examiner） | 232763 |
| 原版做题（solver_original） | 476442 |
| 重写（rewrite） | 16490203 |
| 判定（judge） | 2379423 |
| 候选做题（solver_candidate） | 431290 |
| 合计 | 20010121 |


## 固定版本与公开数据

- 流程分支：minimal/lma-core @ f6601f86ae6b5cc15203fe9d74baa6badbf94cdb
- Detectron2 原版：247691a1c292654867deb35cabb27f18d75a1363
- 候选分支只保存在本地实验仓库；未将第三方候选代码发布到公共仓库。
- 下载 [每轮尝试 CSV](attempts.csv)、[检查明细 CSV](checks.csv)、[公开结果 JSON](../data.json)。
