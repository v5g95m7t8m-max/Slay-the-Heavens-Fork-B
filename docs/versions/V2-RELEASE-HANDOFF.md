# v2.0.0 Release 分支交接

> 快照：2026-11-19（北京时间）；这是**分流入口与待验门禁**，不是实时 CI/PR 状态。每轮先读远端 refs、原生 Ruleset、当前 PR/Backlog 和准确候选身份。状态：**RELEASE_INTEGRATING / RULESET_ACTIVE / CI_POLICY_IN_PR / RC_NO_GO**。Release 集成分支不等于已冻结的发版候选。

> 冻结规则唯一执行入口：[Release维护技能](../../.codebuddy/skills/release-maintenance/SKILL.md)。Quality元数据门禁要求类型/目标版本/发版必要性；Feature拒绝。TASK-42.1/#670的数字键、快捷键、预输入仅后续版本，不以调试便利等理由引入。声明不替代人工diff复审。既有Release保护已只读核验active，原文见[本轮规则读回](../evidence/release-freeze-20261116/release-ruleset-readback.json)；下文2026-11-15未配置状态仅历史快照。新增范围gate仍须正常合入后生效。

## 所有 Agent 的分流规则

- **当前发版**：`release/v2.0.0` 从 `develop@c2409ad750c15124b7b843c6bbfa5b222537cb75` 派生作集成分支；只做岩系旅行者、第一/二幕的必要 Bug、稳定性、性能、玩家可见发布文案及发布元数据，不增新角色/新幕/非必需特性。基于最新 `origin/release/v2.0.0` 在**独立 worktree + fix/<slug>** 开发，PR **base=release/v2.0.0**；禁止直接提交 Release。
- **未来版本**：胡桃等角色、美术实验、第三四幕、非阻塞技术债与新功能，仍从最新 `origin/develop` 派生独立 worktree，PR **base=develop**；实验分支保持独立，不为进度而混入 Release。
- **历史在途 PR 不自动归入本版**：#661、#663 已合入冻结起点；冻结时 #672（PC 修复）、#674（手机药水输入）、#665（发布/版本机制）、#673（手机 Backlog）仍以 develop 为 base、未进入 Release；#668（Lore）、#667（AI 目录治理）另按发布范围评审。协调者**先查最新合并/自动合并状态和精确 diff**，只将明确属于 2.0 的成果按 PR 重定向或选择性移植；勿重复合并、勿因自动队列改变 base 而让在途成果丢失。
- **不得把 `develop` 整体合入 Release**。Release 修复通过独立 PR 同步回 Develop（按变更实际来源选择 cherry-pick/重做），记录对应提交/PR；不在双分支重复独立实现同一 Bug。发布后 Release → master（PR）→ 精确发行提交的 `v2.0.0` 注释 Tag；平台由 Owner 人工更新。同步修复后核对 Develop 不回退。

## Release 准入状态（必须核实）

- `Quality`、`Licenses`、`Quick feedback` 保留 `release/**` PR 入口；日常已映射修复走完整受影响双平台 Fast，Release push 不再重复启动 Quality。未知范围/CI基础设施保守回退与显式 Full 请求见 [CI-FAST](../CI-FAST.md)。实际 GitHub 当前 SHA 检查才算通过，禁止借用旧结果。
- Release Ruleset **27313515 已实际读回生效**：匹配 `refs/heads/release/*`，禁止删除/强推，必须 PR、解决讨论、Strict，Required 为 Actions 来源的 `check`、`presentation`、`engineering-posix`、`inventory`，无 Merge Queue。仅在 Owner 既有授权范围内使用管理员 PR-only 应急合并，须独立审查、完成必要定向验证并核对精确 HEAD/BASE/合并树。独立代码评审依原工程合同核查；Release 使用原生 Auto-merge 等待必要检查，`npm run merge:auto` 仍只用于 Develop。不得直接照抄 Develop 专属状态为 Release 必需项。
- Release 与 Develop 复用 Quality 的 `check:guidance` 步骤执行同一[生产代码规模门禁](../TASK_EXECUTION.md#小批量集成)。
- **日常 Release 修复经独审及必要 Fast/质量检查通过即可自动合入，不等待候选 Full。** 集成完成、准备上线时才冻结准确 Release HEAD，显式请求一次现有 hosted Full；最新完整分片、不可变 checkout 收据与 HEAD/attempt 均通过才可发布，代码变化须重新验收。Release→master 的必需 Quality 自动验证此门禁。入口见 [CI-FAST](../CI-FAST.md)，不自动打 Tag 或上传平台。
- RC 放行还要同一精确 `source SHA + buildId + GIL SHA256 + payloadDigest` 的官方导入/ready、PC/手机实测、两幕自然通关、平台关卡 ≤20MB / 服务器 ≤3MB、负载/性能与更新日志证据。遵循 [发布操作单](../PUBLISHING.md)、[平台负载](../PLATFORM_LOAD.md)、[CI](../CI.md) 及 Backlog 原有 TASK。GIL 无法真实启动、发布级 P0 未解决或任一必需验收缺失时，候选保持不可发布。

## 最短交接口径

任何执行者汇报：`branch/base@SHA → PR@HEAD → CI/独审 → 官方候选/设备/容量（已验/未验） → 未关闭阻塞`。每次实际改变版本范围、合并去向或 Release 门禁时更新本文件的**快照日期与事实**，不把历史快照称作最新状态。

## 2026-11-16：独立容量专项（Owner 新决定）

- **当前 2.0.0 Release 新增 [TASK-111](../../backlog/tasks/task-111%20-%202.0.0关卡容量归因与冗余收口.md)**：直接从 `release/v2.0.0` 独立开展整包存储归因、同源隔离实验和必要的最小修复。**dependencies: []**；不等待 TASK-103、全部产品 UI 或 TASK-100/10.1.2/105 完成。参照这些任务的已交付工具和证据，不重复立项。
- 原有 TASK-105 保留 **M9 未来角色扩容量产**边界，TASK-97 对 TASK-105 的依赖不变；本专项不扩角色、不新增幕，不修改已批准视觉与规则。
- Release 最终冻结同候选的**官方关卡 ≤20MB / 服务器 ≤3MB**仍是发版必要条件；16MB 是争取的内部余量目标。离线 Lua、GIL 或控件计数不冒充官方 MB；没有本轮官方窗口时可先做离线归因，缺证据保持 UNVERIFIED。该段是后续决策补记，顶部 11/15 历史 Ruleset 快照并非最新远端状态。

### TASK-111 离线接续（非 RC）

以下为截至396b5575的历史阶段：见 [本轮归因报告](../research/2026-11-16-release-capacity-forensics.md)：Release `1cc5479b` 的 **Official 诊断配置** 实测编码大户为原生 UI/39 个完整卡面；最小修复只排除该诊断配置无消费路径的 selection133，诊断 GIL 减少 128,379 字节，**不计正式默认包发版收益**。默认配置实计 61 个卡面宿主、8,892 个宿主子树控件，默认肖像源码前后同为 971,304 字节；旧账单漏记及跨配置比较已纠正。序列化仍由 #691 负责，本 PR 未重复其实现。C4 `be5466c1 / ffb7a077-2bb4-48ec-8f23-cad599dd8d0e / 9a3a94c08f708b4fc64b6397395f429f34f7a9b2f3160358cc4b6392734567a4` 使用公开 fixture 基底，**不是用户游戏候选或正式 RC**。官方容量、导入/ready、PC/手机仍 UNVERIFIED；C0/C4 严格审计均有相同三项未通过，不作为发布 GO。本次账单/生成器修订没有新 GIL，C4 不代表修订后 HEAD。后续应在真实基底和届时最新 Release 重建，不能沿用此诊断身份放行。

正式默认包后续已实际减容，见[默认减容报告](../research/2026-11-16-default-release-reduction.md)及[新证据](../evidence/task111-default-reduction-20261116/README.md)。冻结产品bf74c0c3；同配置完整音乐F0→F1实际GIL 15,952,833→10,949,582，减少5,003,251字节；48宿主共享3份原生定义，61逻辑宿主/8,892子树控件保留，默认未使用selection133字段排除。最新F1 build `13e47cb7-c7f8-4837-970e-c50ed49fb26f` / SHA `75e5024bc11b64787414796d6eb6249f4b1a1e2ae258999a2306b701f00ee4d2`，不是旧C4或D1。公开fixture、非RC；四个新前后样本strict audit同为UI_MISMATCH/GRAPH_COUNT两项FAIL。官方20/16/3MB、引擎引用行为和PC/手机均UNVERIFIED，未完成Full，不据此发布GO；不合并或发版。

交付前已纳入最新Release33d（#697）并重新构建：最新F3冻结7b6 / build `a12d9fb4-4996-4673-b910-6715f7be471d` / SHA `35aaa67cc2a84c9d452ab2df6e1c0b0e80f81faff7505a5cf9fba8540b317d41`，完整音乐同配置F4→F3为15,953,517→10,950,266 GIL字节，省5,003,251。F4为保留相同统计工具、仅回退五减容owner的独立合成控制b4bfb55e；与原始33的F2交叉核验无内容影响，详见报告/新证据。旧D2/F1仅是1cc历史样本，不改写身份。严格audit仍FAIL两项，官方/设备UNVERIFIED。
