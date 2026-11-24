# 自动化检查

## 三仓库按需验证

日常开发和预检在 Fork，主仓接收成熟候选并执行正式验收。按[任务执行](TASK_EXECUTION.md#fork-first-开发)选择开发远端和例外。Hosted 预检按风险分配，见 [Fork 预检](CI-PREFLIGHT.md)。旧 `release/v2.0.0` 冻结，当前版本修复从 `develop` 接续。

| remote | 仓库 / 固定 ID | 分工 |
| --- | --- | --- |
| origin | FurinyaWorks/Slay-the-Heavens / 1429751262 | 正式同仓 PR、Required Checks、Merge Queue 和发布 |
| fork-a | FurinyaDev/Slay-the-Heavens-Fork-A / 1460097312 | 默认开发远端，优先运行既有 Quick feedback 的 Fast 预检 |
| fork-b | v5g95m7t8m-max/Slay-the-Heavens-Fork-B / 1460133275 | 优先运行既有 Quality 的高风险 Full 预检，按需与 A 互援 |

只同步本次需要的短分支。首次使用用 `gh api /repositories/<固定ID>` 解析当前名称，再用 `gh api repos/<当前仓库名>` 核对 ID、权限及默认分支，核对 `gh workflow list -R <repo>`；仓库改名时同步 remote，不改历史证据。Fork 有工作流文件却列表为空时，管理员可用官方 `PUT /repos/<当前仓库名>/actions/permissions` 设置 `enabled=true` 并保留已读回的 allowed_actions 策略；读回工作流已登记后才 dispatch。无写权限时记录阻塞，使用有权限的另一个 Fork 互援，不请求付费或削弱主仓库保护。

复用现有入口，不增加调度器、Runner 或跨仓库凭据。**新任务分支从包含此配置的最新主仓 develop 创建**，推送代码自动检查，不需要 Agent 具备 Actions 写权限：

```sh
git push fork-a <task-branch>:refs/heads/<task-branch>       # A：自动 Quick
git push fork-b <task-branch>:refs/heads/ci/full/<task-name>  # B：仅风险要求 Full 时使用
```

Fork A 的 Quick Push 对映射 Fast JS 和按 90 秒 Lua 调度估算筛选的子集、廉价治理及现有质量棘轮进行 advisory 检查，自动作业硬上限 10 分钟；integration 和延后的 Lua 仍需正式 Full，不声称完整覆盖；纯 Markdown 推送不运行。Fork B 的特殊 `ci/full/**` 分支 Push 自动运行完整 hosted Quality，常规任务不推 B，也不默认重复 Full。两者在运行时固定主仓 develop 比较 BASE 与 HEAD；A 自动 Quick 仅写 advisory 摘要且不生成或上传完整 preflight 证书，手动完整 preflight 保留原 30 分钟上限及记录选测 BASE 的收据，B 的比较 BASE 保存在 impact 摘要，Full Push 收据仍保留原 `event.before` 合同；主仓基线若已推进，Fork 结果只作为诊断，不可冒充开发起点或正式主仓准入。已有有效运行按 HEAD/BASE、模式、覆盖和 attempt 复用，新的同分支 Push 自动取消过期运行，不轮询守候。对仍不包含新工作流的旧候选，允许正常主仓 PR 自动 CI，不强改提交历史；手动 dispatch 仅作为回退。

切片通过适用预检后，把所测 HEAD 同步到 origin 短分支。同步前复核实时目标基线和 Fork ref，正式 PR 正文记录 Fork 来源及验证结果。后续使用现有同仓 PR、独立 Review 和原生准入。主仓 Required Checks、队列组合及合后验证各自按实际提交执行。重建只接回 develop 仍缺且属于本版的切片，在实际合并树验证。候选的 Full 与官方容量、导入、ready、PC/手机逐项验收。合并后按既有生命周期核对和清理各仓临时 ref。

算力分配复用已有 [Fast 选测](CI-FAST.md)、`scripts/ci-quality-shape.mjs` 的共享矩阵、`ci-shards.mjs` 的平台耗时权重、安全 Lua worker 与 Quality 原 `max-parallel`，不要在 Fork 另维护分片数或删测试。先分配互不重复的任务/准确提交，再让原矩阵自动铺开；以实际 job 排队和执行时间判断资源使用，保留失败成本。GitHub 并发上限按账号/组织套餐和 runner 可用性核对，不假定每个仓库天然拥有固定20/30槽位；沿用标准 hosted，不切付费 larger runner。[官方并发与矩阵说明](https://docs.github.com/en/actions/reference/limits)。

按 [CI-FAST](CI-FAST.md) 选择本地反馈和正式验证。实际触发、矩阵和作业预算以 [Quality](../.github/workflows/quality.yml)、[Licenses](../.github/workflows/licenses.yml) 和[共享形状](../scripts/ci-quality-shape.mjs)为准。早期矩阵、Runner 和保护快照见[CI 历史与退役流程](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/2ec45b9e52c870badc4d4888f6243a30556eecb4/docs/CI.md)。

## 多 Agent 协调集成

日常仍优先独立短分支与小批 PR；仅需要外部前置能力时，先让依赖落入 develop。同步已落地主线可使用 merge；独占分支可自行选择 rebase，但不为历史外形要求重写已共享提交，不自动强推。现有 Strict 与精确 HEAD/BASE 授权仍适用：本次不承诺消除基线推进后的重新验证。

多个 Agent 的成果需要一起交付时，采用一个协调集成 PR，而不是各分支相互反复合并；这是正常的受审集成路径，不是紧急绕过 CI：

1. 指定一个协调者，从最新 develop 建独立工作树/短集成分支。只冻结本批来源身份和写入范围，不停掉其他独立任务；接管前按原 `merge:auto --pause` 暂停来源 PR 并读回出队，防止来源 PR 与集成 PR 重复交付。
2. 在集成 PR 正文记录来源 PR/分支、完整固定 HEAD SHA、纳入范围及冲突取舍。按固定 SHA 合并，保留原提交与集成节点；后续来源新提交不自动纳入。不能把他人的脏文件、未知工作或未授权范围悄悄打包。
3. `Depends-on` 只列**本次未包含、必须先独立合入**的外部前置 PR，仍须已落入受审 BASE；已整体纳入的工作列在来源清单，不伪称原 PR 已合并。只纳入部分成果时，逐项写清取舍与剩余依赖，不能把尚缺的前置改成 `none`。
4. 对最终组合的精确 HEAD/BASE 重新独立评审与验证，重点核对来源完整性、冲突解法和跨模块行为；多来源集成使用已有 `ci:full` 请求 PR Full，再走原 Merge Queue 组合 Full 与合后验收。来源各自的绿灯或审查不能拼接成组合通过；失败在集成分支追加修复，不为过关清理历史、删测试或放宽门槛。
5. 组合实际合入并验收后，逐来源核对固定 SHA 的成果、后续新提交、脏文件及唯一证据，再关闭已承接的 PR并注明集成去向。squash 不会让来源 SHA 成为 develop 祖先，不能只用 `--is-ancestor` 判定成果已交付；保留来源清单和恢复点，有新工作或未纳入内容的分支不删除、不误记 Done。

来源范围与独立审查的真实性仍由现有协调/复审流程核实，历史审计不自证这些事项。复用现有 PR、Backlog、交付收据与队列，不新增常驻协调器或第二套任务锁。

Licenses 与 Quality、Quick feedback 一样使用 GitHub 原生同引用 concurrency；新提交取消旧提交，PR 与 develop 的运行独立。已结束的 cancelled 保留历史；只有确认被更新 HEAD 或实际合入提交覆盖的非终态运行才手动取消。queued 先核对 runner/开始时间，pending 步骤表示依赖尚未执行，不能据此判断卡死。最终以最新 develop SHA 的完整必要检查成功为准。

候选构建与证据合同见[ENGINEERING.md](ENGINEERING.md)。不要通过加超时、删种子、删断言或跳过有效测试处理红灯。

## 核心分支原生保护

以 GitHub 实时生效规则为准。用 `gh api repos/FurinyaWorks/Slay-the-Heavens/rules/branches/develop` 读取匹配规则；需判定例外权限时，另读取返回 ID 对应的 Ruleset 与实际账号角色。旧快照中的检查名、合并队列参数、豁免及旧仓库名只用于历史证据。

`develop` 正常合并要求 PR、squash、线性历史、讨论解决、Strict 和原生队列。必需状态为 `check`、`presentation`、`engineering-posix`、`inventory`、`pr-quality` 和 `independent-review`；`full-quality` 表示完整 Full 的独立证明。真实独审由可信协调者核实，GitHub 原生批准数以线上规则为准。Release 的保护及候选证据按 [CI-FAST](CI-FAST.md) 和[发布入口](PUBLISHING.md)核对。

## GitHub 原生 Merge Queue

当前已启用原生队列，以[生效规则](#核心分支原生保护)为准。未增加第三方 App、Runner 或常驻调度服务。下列机制仍生效；后面的早期上线顺序属于历史切换步骤，不能据其重复配置或把排队当作 Full 通过。

- `quality.yml` / `licenses.yml` 监听 `merge_group(checks_requested)`，只针对 develop。impact 在非 PR 事件强制 **Full**；共享矩阵包含 Windows、POSIX、presentation、inventory 及汇总作业；片数直接以 `scripts/ci-quality-shape.mjs` 为准，Fast 不能放行队列。
- 队列生成的组合提交与原 PR HEAD 不相同。现有 PR 侧 `independent-review` 仍由协调 Agent 核实真实独立审查；队列侧同名状态仅在 GitHub 原生队列准入、原六项 Required contexts 和整个组合 Full 均经校验后发布。**它不是对组合代码重新做独立人工审查**。队列的代码组合由 Full 验证。
- 队列开始时关闭准入状态；成功前复用既有 `checkoutReceipt`、共享形状的完整作业集合、实际 checkout SHA 和不可变 artifact 校验。失败、缺片、过期 run/attempt、Ruleset 漂移或无法验证的组合均不发布 success。保留 PR/push 的验证及合后收据，不能从队列绿灯反推原 PR 实机验收。
- #504 已合入迁仓身份和 #505 的严格收据继承；本切片在其上接续。队列发布同时核对实际收据的有效执行 attempt；不会用最新 run attempt 冒充未重跑首片的原执行。
- 组合放行前读取原生队列的完整成员前缀、当前组合 ref 和 develop BASE；逐 PR 检查当前 HEAD、hold、依赖落地及最新审查授权。成功授权描述追加精确 `[base:<SHA>]`，旧的无 BASE 标记状态须重新授权。下载不可变收据后重读授权与 Ruleset，要求 Squash、ALLGREEN、无 bypass；缺能力、缺页或无法唯一证明成员时关闭门禁，不猜测 GitHub 队列形状。首版最多验证 100 条完整队列成员，更多成员保持阻塞。
- 迁移前的管理员握手：GitHub 对只读 CI 隐藏 Ruleset 的 `bypass_actors`，不能将缺失字段当作空数组。原管理员协调器必须亲见空数组，将完整规则、ID 和规范化 `updated_at` 的 SHA-256 绑定到精确 HEAD 审查状态的 `[rules:<摘要>]`。队列发布器要求该状态作者与原生入队者的不可变用户 ID 一致，并通过现有 Metadata 只读 API 重核作者仍为仓库 admin；公开规则及版本须与授权摘要完全匹配，下载后再读。该证明依赖现有可信管理员协调器，不是加密签名，也不表示 CI 亲见隐藏字段；规则变更或身份降权须重新授权。该历史见证在本轮仅作只读兼容；实际操作者权限与新云端门禁按下文合同，不重复要求连接器取得 Admin 或状态写权限。[API 字段可见性](https://docs.github.com/en/rest/repos/rules#get-a-repository-ruleset)与[用户权限读取](https://docs.github.com/en/rest/collaborators/collaborators#get-repository-permissions-for-a-user)。
- **历史上线顺序**：实现经独审与 Full 合入后，先启用 Require merge queue，再将 Required 的 `full-quality` 切换为同 Actions 来源的 `pr-quality`；读回保留 Strict、Squash、ALLGREEN、空 bypass 和原四项检查。真实样本仍须逐项保存成员、base/head、组合回归、暂停/失败剔除与合后 push 证据；不能从配置已开启推断全部验收完成。
- 先维持原 Strict 门禁和 `npm run merge:auto`，避免切换时放宽旧准入；要实现真正免更新分支的吞吐收益，还须**在演练后**适配旧协调器对固定 BASE / Strict 的假设，再决定是否关闭 Strict。禁止先关闭 Strict 或临时删除 `independent-review`/`full-quality` 来消除队列等待。
- **回退**：若需停用 Require merge queue，必须先恢复 Actions 来源的 `full-quality` 为 Required 并读回，保留原四项检查、independent-review 与 Strict；不能留下只有 PR Fast 的保护。原入口会拒绝缺少 Full 队列的 Fast 准入。当前主仓库为 `FurinyaWorks/Slay-the-Heavens`，固定 ID 为 `1429751262`。

官方依据：[GitHub Merge Queue 配置](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)；[merge_group 事件](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#merge_group)。

## PR 自动合并准入

主仓身份以 `/repositories/1429751262` 返回的当前名称和实际 PR/run 仓库 ID 为准。迁移前的授权和收据保留原文，合后验收按[仓库身份代码](../scripts/repository-identity.mjs)校验迁移见证。

develop PR 的独立评审与 CI 并行。审查与准入通过后可挂起原生 Auto-merge；这只是授权，不是 `pr_passed`。PR 侧必须等原四项门禁、`independent-review`、`pr-quality` 全绿并满足严格基线才能入队，实际 squash 还须组合 Full 通过。Draft、冲突、未落地依赖、已知 CI 失败及锁定标签在启用前拒绝。

### 现有云端独审与 Actions 门禁

由真实、独立的 Agent 会话在合并前审查。现有可信维护协调者亲自核实实际会话与未解决问题，再以自己的 GitHub 身份提交绑定精确 HEAD/实际 develop BASE/合并树的 COMMENTED Review；同 PR 作者账号也可使用。APPROVED 历史记录仍可读取，但不是准入所需的第二人审批。原生记录证明签署账号与提交，不自证 AI 独立，报告中的 agent 名称也不自证会话；沿用现有“可信协调者核实实际独审”的边界。后续 Actions 从受保护的实际 BASE 源码校验报告、依赖和正式 CI 证据，发布真实独审状态；移除连接器直接写状态、隐藏 bypass 字段认证及重复的入队者 Admin 授权。

### 常规使用

PR 正文须恰有一行 `Depends-on: none` 或 `Depends-on: #123, #456`。可信协调账号确认真实独立 AI 会话后，将完整报告交给原有命令自动以 GitHub COMMENTED Review 签署当前 HEAD（也可复用已存在的服务端记录）：`<!-- independent-ai-review:v1 -->` 后紧跟一个 JSON，含 `schemaVersion: 1`、`kind: independent-ai-review`、固定仓库 ID/名称、PR、`reviewedHeadSha`、`reviewedBaseSha`、`reviewedTreeSha`、`conclusion: pass`、`unresolved: []`、不同于全部 `implementationAgents` 的实际 `reviewerAgent`，以及签署账号 `coordinator` 和真实 `provenance.reviewId/sessionId`（`kind: coordinator-verified-agent-session`、`coordinatorVerified: true`）。未核实会话的 JSON、本地测试绿灯、非可信账号、旧组合、被驳回/撤销或仍有问题的报告均不能放行。

```bash
npm run merge:auto -- <PR> <完整独审报告.json>
# 已签署的记录可只读检查或先shadow；未签署本地JSON的dry-run不作eligible
npm run merge:auto -- <PR> <GitHub-Review-record-ID> --dry-run
npm run merge:auto -- <PR> <GitHub-Review-record-ID> --shadow
```

完整报告的reviewId幂等复用，已有同ID但不同证据拒绝；不能重复POST旧pass覆盖后来的fail/撤销，须新的实际独审。云端交付协调者调用现有命令后，GitHub 负责 CI→Queue→Merge 等待，不需人工再审批。命令读取真实签署记录、当前协调者权限、已合且已纳入基线的依赖、当前完整 PR 合成树及公开保护，绑定 `expectedHeadOid` 请求原生 Auto-merge并读回；不直接发布独审状态，也不重复执行或下载 Full。schema9 `native-auto-merge-intent` 只是原生合并意图定位，不是测试通过凭证；缺失或已知失败/取消的正式 CI 拒绝。

既有 Licenses 工作流复用一个小型门禁作业：Quality 完成事件或准确 dispatch 时读取最新受信 Review，下载原 schema3/7 正式 CI 不可变收据，校验全部必要作业与当前 run/attempt，先上传唯一 `native-ai-review-proof.json`（artifact 名绑定 PR/HEAD/run/attempt），再重读相同身份，最后由 Actions 发布真实 `independent-review` success。shadow 只留证据、不写 Required success。常态 gate 的运行源码 SHA 必须等于实际受审 develop BASE；PR 文本只作为数据，不执行 PR 中的程序来发布独审证明。Gate-only 使用独立 concurrency 与非 Required 的跳过名称，避免取消审计或覆盖 `inventory`。

安装保留现有可信维护者边界：真实独审报告须显式签署 `installBaseSha`，与实际受审 BASE 一致，协调者用 `--bootstrap-ref=<本 PR 源分支>` 自动接续。GitHub 服务端 dispatch actor、triggering actor、签署身份一致，运行源码 SHA 等于已审候选 HEAD；生产者、Queue 和合后消费者各自读取该 immutable BASE 的 commit、完整 root tree 和 scripts tree，确认 `scripts/independent-ai-review.mjs` 尚不存在。同名任何 Git 类型、缺失/截断元数据或403均不得当作未安装。已安装的 BASE 必须走可信 BASE 源码，不能候选自签。安装窗口不钉死某个旧提交；改变原受审组合或安装授权须新真实审查及 CI，不能改写旧报告。后续原生前缀正常推进按下述组合合同接续。未来如模块被删除，缺失本身也不授权重装，仍必须新的明确安装签署。历史证明核其 immutable 原安装 BASE，不因合后已安装而伪造或否定历史。

队列迁移只读接续尚未继承新模块、且无受信账号新 marker 的旧管理员授权，不签发 legacy 授权。受信新 marker（任意格式）、HEAD 或共同祖先 LCA 含同名模块，均强制完整新 proof；API 错误、缺失或截断元数据不得回退。旧审查的签署者仍须当前 admin，原规则指纹、精确原基线、最新正式 CI 和已落地依赖继续验证；实际入队者则按不可变 ID/login 重核当前原生写权限，不再要求签署管理员本人代点。这是按 Owner 要求恢复原生写权限操作者范围，不是把 write 当作旧审查者；签署者和入队者相同可复用管理员读取。新路径必须消费真实 Actions 不可变 proof，并以最新服务端 Review、当前角色和正式 CI run/attempt 重核原独审。原签署基线必须可验证为当前受保护主线和实际组父提交的祖先，不能把分叉或任意旧基线当作有效授权。

原 PR 的受审/正式 CI 基线 `B0` 和合成树保留原样，分别核对当前受保护 develop `D`、实际队列父提交 `Q`、实际队列提交/树 `G/Tq`。非首组的 `Q` 可以是前一条原生 squash，尚未等于 `D`；GitHub 原生完整成员前缀、真实 ref、`G.parents=[Q]` 及完整组 Full 共同认证该组合。REST PR.base.sha 的缓存值只作审计，不冒充当前 Git ref。两次读取均须完整认证；仅允许已验证的连续前缀正常落地收缩，目标 entry、G/Q/HEAD 及剩余成员的审查、权限、依赖和测试身份须不变。不能因为普通前缀推进而重签原报告，也不能拿原 PR 的树冒充未来组合树。正常独审签署及正式 CI 的当前基线发布条件不因此放松。

资源清尾复用 Licenses 的 `pull_request_target(dequeued)`，仅在主仓 develop 的可信 BASE 源码运行小型取消作业，不执行 PR HEAD 程序。独立 concurrency 和非 Required 的跳过名称避免取消或覆盖正常 inventory。只在完整队列、Quality 运行及 Git refs 元数据均可读、取消前重读仍确认旧 HEAD 已离队且其引用已删除时取消该旧 merge_group 运行；保留 PR/push/dispatch 与仍有效组。动作只获本作业的 Actions 写权限，不写检查、不改队列或分支，不新增工作流或定时调度。权限/分页/竞态不明确即跳过，HTTP 阶段及取消读回如实记录，接受请求不等于已经取消。

PR 日常受影响 Fast/高风险 Full 路由不变；Fast 不发布 Full success，真实队列组合与合后 develop push 仍 Full。合后运行 `npm run verify:delivery -- <PR> <schema9意图.json> --merged`，从最新真实 Actions 状态及不可变 artifact 恢复原 schema3/7 合前观测，另核实际组 G/Tq/[Q]、原基线到 Q 的真实祖先比较、完整队列 Full/inventory、实际 squash 与 push Full 收据及 Backlog。shadow、替换附件、旧 run/attempt、祖先关系失效、非 Actions 来源或缺队列证明均保持 `merged_pending`；原 PR 合前树不改写，旧 schema/Fast 合后格式继续按原合同读取，不冒称本次修复了所有历史格式的基线限制。

自动化边界：AI 由现有云端交付会话执行，Actions 验证预存的实际独审结果，不声称它能唤醒已退出的 Codex 会话。准确报告预存且原受审 HEAD/B0/树未变时，后续 CI→Queue→Merge 无人值守；改变原受审组合仍须真实重审，不能把旧报告改写成新 BASE。D/Q 的正常前缀推进由祖先链和真正组合 Full 验证，不冒充对新组合重新做了 AI 审查。仍沿用现行可信维护者接纳 CI 源码的边界；Any-source 检查和 Actions artifact 不是供应商 AI 数字签名，也不声称能阻止有权限修改所有 CI 的恶意维护者。

**Backlog 同轮收口**：已合 PR 正文用唯一 `Backlog:` 行显式列出改动任务的 `done`、`verify`、`continue` 或 `superseded:TASK-承接`；无任务更新才写 `none`。上述合后入口在真实 `merged_passed` 后核对完整 PR 文件清单、实际最新 develop 与合入时任务快照，再通过 Backlog CLI 更新并读回。`done` 不自动勾 AC，全部已勾才移入 completed；`verify` 保持 In Progress/待验，已有 Blocked 须先明确解除，不能隐式恢复；`continue` 留本轮接续备注；替代归档必须有有效承接且活动依赖已迁移。未知声明、旧工作树、后续任务变化、CLI失败或读回不符保持 `Backlog pending`，不得把代码交付成功当作任务已同步；已写入步骤可安全接续。历史 PR 无声明时先人工对账，不补造其合前声明。该入口没有后台轮询，当前会话不必守候；下次合后验收执行同一命令即可。

纯对账 PR 已通过 CLI 更新、归档或移入 completed 的任务用 `TASK-编号=recorded`：仍逐项验证合入快照和 Done 的全部 AC，但不再次改状态、归档或追加备注。它不是完成声明，也不消除原未验项，便于同一 PR 交付历史清理而不重复执行清理。

暂停使用 `npm run merge:auto -- <PR> --pause`；若已在原生 Merge Queue，命令先调用 dequeue 并读回成员身份消失，再关闭并读回 Auto-merge；不改写独立评审事实或伪造失败状态。不能仅凭 `gh pr merge --disable-auto` 的退出码认定已出队。移除失败、能力未知或重新入队均不报告 paused。仅添加 hold 标签不是已确认取消。改变依赖/授权意图前先暂停，重新审查后再启用；已声明依赖必须是已纳入受审基线的提交，不允许授权未落地依赖。Strict 保留；更新分支形成新 HEAD 后须有新审查状态，不自动强推、自动重基。队列正常前缀推进按上述合同认证，祖先分叉、组身份或原审条件改变不继承旧授权；原生 API 不提供可变正文/标签的原子条件，本流程不作此承诺。

自动入口仅用于同仓库的 develop PR，不改变 master 的 release/hotfix CI。Fork 的只读 token 不能发布新必需状态，其成果须由维护者接续到同仓库短分支后重新审查、验证；不是直接绕过门禁手动合入 fork PR。旧 run/attempt 的 planner 与 aggregate 不得覆盖新运行已写入的 pending/success。

### 异步交接与失败对账

独审和准入核实后，按上文运行 `npm run merge:auto`，读回原生授权并交接。GitHub 接管正常等待和合并。按失败通知、依赖变化或验收需要查看当前 run/attempt，避免持续轮询。依赖未落地时记录阻塞和接续点。

保留 PR、精确 HEAD/BASE、授权结果和 `build/delivery/auto-merge-*.json`。实际合入后运行 `npm run verify:delivery -- <PR> <schema9意图.json> --merged` 核对合入、push Full 与 Backlog；未取得对应证据保持待交付。

## Owner 授权的 PR-only 应急合并

当前主仓库 develop Ruleset 25870651 与 release Ruleset 27313515 使用仓库管理员角色 `pull_request` 豁免。每次使用前读回 Ruleset 和实际账号权限。日常准入继续使用原生 Required Checks 和队列。Owner 明确授权的范围内，已经过独立审查及必要定向验证的低风险切片可直接 squash，保留 PR 及批准记录。核心行为、正式候选及高风险组合须取得各自必要的完整证据。CI 尚未完成或自身故障时记录真实状态与已取得验证。已确认由本 PR 引入的回归必须修复，正式发布仍须完成全部必需验收。

1. 复核所有依赖已落地、无冲突和未解决审查，记录完整 HEAD、实时目标分支 BASE、候选树、缺失的 CI 与验证证据。已在 develop 队列的 PR 先用 `npm run merge:auto -- <PR> --pause` 出队并读回。
2. 立即重读 PR 和目标分支，确认身份与风险仍在已授权范围内。提交包含精确 HEAD 和 squash 方法的临时 JSON 文件。

```json
{"sha":"<完整已审 HEAD SHA>","merge_method":"squash"}
```

```sh
gh api --method PUT repos/FurinyaWorks/Slay-the-Heavens/pulls/<PR>/merge --input approved-merge.json
```

3. 读回 `merged: true`、目标分支、合入 SHA、合入者、实际父提交与树。遇到冲突、并发变化或接口拒绝先核对远端状态。合后按可取得的精确证据完成交付核验，单独报告真实 Hosted 检查结果。按分支生命周期核实来源和下游依赖后再清理。

历史隔离实测和 API 证据见 [TASK-70](backlog-details/task-70.md)。

## 已审阅 PNG 的按需 LFS 读取

`ci-reviewed-lfs.mjs` 只允许 `art/cards/traveler-geo/` 中已审阅的六个精确 PNG 路径、OID 与字节数，冻结对象 payload 合计上限为 **5,983,528 字节**。本次Cleave及身份修正版Heavy共新增4对象、4,202,803字节；Armaments既有2对象保留，旧Heavy两对象仅在历史保留、不重复上传。拉取前校验 index 指针，缓存命中也不能绕过；拉取后必须验证真实 PNG 签名、完整 SHA-256 和字节数，原资产与 license 验证继续执行。指针文本不能充当已验证图片。

Quality 的图片准备与执行共用 `ci-shards.mjs` 计划；独立 LFS 工具仍保留原生 Node 分片诊断接口。只在实际承载 `reviewed-traveler-geo-assets.test.mjs` 的一个 Windows 分片及一个 POSIX 分片准备六图；Licenses 全 inventory 审计另准备一次。新增测试文件会移动分片，选择器不固定分片编号；原生 Node CLI 前后插入探针验证一致。presentation 没有这些图片依赖，不额外拉取。

checkout 默认 skip-smudge，自托管路径也显式禁用自动 smudge。仅显式 `git lfs pull --include=<六精确路径> --exclude=`，不使用 `fetch --all`、目录通配或历史全量拉取；git-lfs 3.6.1 的 pull 只扫描当前引用/index，不读取 fetchRecentAlways 的历史抓取设置。测试同时覆盖被扩大的 recent 配置和缺失的非目标对象。

使用既有 `github.token` 的只读权限，认证只放 Git 子进程环境，清除原 token 环境项且不回显 Git stderr/headers；不持久保存凭据，不增加工作流写权限。干净runner所需LFS filter仅用本次Git命令的`-c`设置，不修改持久Git配置。沿用本地 `.git/lfs/objects` 缓存及 npm/pip 现有缓存，不新增大型远程 cache。对象已在本地则不重新下载；缺失对象、超预算、OID 变化、错误内容均失败，不静默跳过。

上述上限是**允许对象的逻辑 payload**，不是 HTTP/TCP 字节、账号月度用量或费用硬限额。协议开销及额外运行不包含在内；传输关闭额外重试且有界超时。代码/离线测试不能替代远端真实下载和当前 SHA 的完整 hosted Quality/Licenses 验收。

完整执行提速记录、权重来源与实际时长对照见 [TASK-75](backlog-details/TASK-75.md)。权重只改变文件归属，不决定文件是否运行；未测新文件使用正数保守权重，日志输出 `CI_FILE_TIMING` 包含真实文件耗时，后续校准无需选测器。

托管 Windows 的原始 Lua 阶段使用 `--workers 2`，最多同时运行两个独立夹具进程。每个进程仍调用原同步 `runLua`，保留原超时和输出上限，失败后继续其余文件并使汇总失败。输出按完整夹具缓冲后写入，便于核对无重漏。本地默认及 `local-special` 使用 1 个 Lua worker。Lua 分片仍以 JS 分配负载作为初始权重，保留原有 Runner 矩阵和 required checks。

GitHub 托管 Full 的 JS 分片可将文件划为两组，在隔离的检出内分别逐文件串行，最后合并计时记录。本地和自托管执行沿用单组。原分片清单中的每个文件执行一次，沿用作业时限和测试失败语义。

原始Lua的双进程只用于历史实测不足10秒的短夹具；达到10秒或未测的新夹具独占执行，再启动短夹具池。分片将独占夹具按占用两个潜在槽位计费。

2026-11-07 Owner要求停止逐秒放宽、反复整套重跑：Windows30分钟、POSIX20分钟改为性能目标，当前执行硬超时分别45/30分钟；耗时预测及60秒预留只作提示，不因超过预测扩分片或阻止交付。17/13分片、worker、安全资格、完整唯一覆盖、功能断言及严格合并门禁保持。默认Lua防卡死预算集中于`ci-timeout-policy.mjs`；调用方显式timeout和故意超时测试仍按原值执行。Sapphire每片准备、构建、Lua共用90秒防卡死预算，原21组与五片不变。保留真实耗时日志，用实际性能回退证据处理速度问题。

同一SHA的Full因临时runner故障失败时，保存日志、定位原因后可用GitHub原生`gh run rerun <run-id> --failed`只重跑失败作业；已有证据验证器按同run、同SHA、每个作业最新执行验证，保留前次成功作业。当前develop基线与tested组合也必须相同，基线推进后旧组合不能借用。业务失败必须修复，新SHA仍重新执行完整验证；不自动循环重试，不将旧失败记为成功。Fast仍要求当前attempt完整双平台，合并队列始终Full。

两项required汇总使用`!cancelled()`：普通失败或跳过依赖仍进入原严格shell断言，整轮被取消则不再排队执行汇总，避免旧run占着同PR并发组阻塞新候选。取消没有成功资格。已卡住的历史运行在核对精确过期HEAD并保留证据后，可用GitHub原生force-cancel清理，不反复取消或重跑业务。


## 既有媒体的精确 LFS 存储与完整比较

2026-11-12 合流冷检出为218235384字节，原128MiB门禁据实拒绝。既有738条PNG/JPEG/GIF路径改为LFS，705个不同对象合计117369505字节；这是既有原字节的存储迁移，不是新增素材、授权或运行时容量。`config/ci-media-lfs.json` 固定每路径原SHA、大小、原许可类别及source9ed/base3a的真实旧binary Git OID。原六PNG的5983528字节上限、四预览组、原资产校验与所有许可正文不变。新清单只允许当前精确对象，不抓历史、不用目录通配；对象总量按OID去重，不冒称HTTP/TCP或费用上限。

PR646 的 f347 冷检出实测159956847字节，仍由原128MiB门禁拒绝；8MiB比较源准备已通过。清单的独立 `evidenceExtension` 仅迁移该提交新增的58个native state gzip对象，共37495268原字节、76条精确文档路径（含18条inspection别名）；每条冻结原SHA256、大小、Git blob OID、既有来源类别与f347来源。原738条记录和117369505字节预算原封保留；扩展单列预算，复用同一恢复、索引、逐字节认证及90秒期限。`tests/helpers` 来源归档和任意未登记gzip不在迁移范围。许可检查也将清单精确登记的gzip纳入敏感路径，恢复后验证原始字节，不以文件扩展名跳过。

Windows hosted仍从空Git数据库检出精确SHA、depth2及双父，增加blob:none。pack guard前取全实际parent/比较base中缺失的非清单blob，保留fetch pack并禁止自动维护；新增missing对象实际原字节总量超过8MiB即失败。原128MiB原样计算全部检出及预取pack；之后禁止lazy fetch。数据量断言是下载后验，不冒充传输前限流。安装式runner的原增量128MiB检查和有界long-push后备保留。

二进制转换不能靠漏读旧对象来跳过有效空白检查。`ci-whitespace.mjs` 鲜查全部before/after/index路径的cached及working属性，排除集合只能恰为清单；每路径必须是精确普通100644指针，旧侧只能是该路径已实读确认前8000字节含NUL的冻结旧OID或当前pointer，且旧diff属性不得强制text。指针采用完整字节验证，其余所有文本仍执行原git diff --check及rename语义。未知旧OID、额外排除属性、symlink mode或指针漂移均拒绝。冷partial clone负控证明旧binary保持missing，文本空白仍失败，比较后没有新增未计量pack。

Full、Fast、Quick、Licenses及presentation在实际读取媒体前恢复并逐文件验证原始SHA和大小；无token的缓存命中同样重验索引/模式/内容。只读token仅放Git子进程，不持久化或回显认证信息；关闭额外重试，准备共用90秒期限及原步骤时限。metadata导入不依赖可选globSync，实际分片仍在固定Node24.18.0运行，presentation显式同版。新实现不新增job、worker或放宽测试/官方容量门槛。

按风险分配的完整预检与复用规则见 [Fork 预检](CI-PREFLIGHT.md)。Full 的 impact 按冻结清单下载并校验媒体一次，当前运行内的 Windows/POSIX 分片取同一份中间工件并重核索引、大小和 SHA-256。既有受审 PNG、运行预览和许可证验证继续按各自入口执行。工件保留七天，超过保留期的失败分片需从 impact 开始重跑。

治理以原生机制为底座。新增自定义防护先用真实失败证明需要，再比较故障拦截、CI耗时和维护返工；先做最小诊断，按已发生的问题逐步补强，不预先堆叠来源快照、签名或强制收据。持续复用 `ci-run-costs.mjs` 按需取样，不新增常驻统计任务。
