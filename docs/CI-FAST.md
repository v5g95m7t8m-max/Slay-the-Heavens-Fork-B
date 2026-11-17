# CI 按影响选测

TASK-81。快速反馈、完整受影响回归、集成验收分层报告；性能验收仍须真实当前版本的样本，不沿用旧 PR 或取消运行的资格。

普通 develop PR 使用完整受影响集合，不采用原 advisory 的90秒截断。Windows和POSIX均执行选中的完整JS文件和Lua夹具。所有原断言、子进程预算及失败语义保持。180秒仅为反馈目标，`exceedsFastTarget` 明确报告超目标；已证明的完整选集不会因耗时扩大为整仓，也不截断慢测试。Fast 作业采用与 Full 相同的平台硬守护（Windows 45分钟、POSIX 30分钟），这是终止失控执行的上限，不是速度承诺；原夹具期限不变。只有明确列出的纯文字文件可免业务回归，仍执行治理、许可和presentation门禁。

develop 按 `config/architecture.json` 分类，核心模块仍保守 Full。`release/*` 日常修复（含核心 Lua）默认使用已证明完整的受影响 Fast；未知范围、数据/配置/依赖/工作流与 CI 准入基础设施仍保守 Full，显式 `ci:full` 仍有效。Release 合入后的 push 不再触发 Quality，PR 的双平台回归、治理、presentation 和 inventory 必须通过才可 Auto-merge；Release 不使用 Merge Queue。develop/master push、develop 队列组合及手动 Quality 仍 Full，现有矩阵、断言和失败阻断保留。

Release 完成集成后才冻结准确 HEAD，由人显式执行 `node scripts/release-ci.mjs freeze release/v2.0.0 <40位HEAD>` 请求一次现有 hosted Full；该命令不等待、不发布。完成后执行同入口 `verify release/v2.0.0 <同一HEAD>`，核对最新手动运行、实际完整分片和最新执行结果，并再次读取分支与 attempt；Fast、local-special、失败、取消、漏片或 SHA 变化均不能放行。Release→master PR 的现有 impact 作业强制执行此校验，缺证据直接失败。代码变化须重新冻结验收，不自动批量重跑 Full。

草稿 PR 继续使用现有 Quick feedback；正式 Quality 延后到 Ready，并验证其后的新提交。转回 Draft 会通过原 concurrency 取消过时 Quality，不额外建立调度器。草稿跳过不构成准入证据：Ready、精确 HEAD/BASE/attempt、双平台成功及独审仍须满足。Merge Queue、push、发布和手动验证不受草稿条件影响。

Required Checks保留check、engineering-posix、presentation、inventory及independent-review。TASK-81.2将额外PR准入改为Actions来源的`pr-quality`：安全PR须双平台Fast、实际不可变checkout/完整选测计划收据及当前独审；高风险仍须PR Full。`full-quality`保留原义，Fast永不发布Full成功。Ruleset切换必须等实现经原门禁合入后读回，源码合入本身不代表远端配置已生效。

原生Merge Queue对真实组合SHA强制原完整Full，同时发布`pr-quality`、`full-quality`和队列准入状态，全部必要检查通过才squash；develop push继续Full。失败、取消、漏片、旧HEAD/BASE/run/attempt、过期artifact及规则指纹漂移均拒绝。Fast不支持借用旧attempt的收据。`merge:auto`仅在原生队列已受保护时接受Fast，仍使用pending独审握手、精确HEAD及暂停读回。schema6授权和schema7 Fast证据与原schema3/4 Full证据分开；合后另外核验schema8真实队列Full、inventory及独立push Full。纯文字白名单也必须经过双平台治理和独审。

Quick feedback 自动随 develop PR 运行，也保留手动诊断；它是 advisory，不进入 Required Checks。`npm run test:fast -- --base <commit>` 与 `--ci-fast` 共用选集：纯 JS 和按测量权重在 90 秒估算内安排的完整 Lua 夹具，优先直接修改的夹具；执行时先跑选中的直接修改 Lua，再跑 JS，最后跑其余 Lua，任一步失败立即停止，不重复夹具。估算不是超时，不更改夹具原断言和期限。`--plan` 的 `feedback` 可查看两入口的实际选集。`test:related` 仍运行完整受影响集合，未知输入回退 `check`。

fast/advisory 对未知输入只提供可独立映射部分的反馈，并明确要求完整 Quality；零测试显示未执行及非回归验收，不启动重复全量，也不声明覆盖。集成 JS 和未排入的 Lua 由完整 Quality 兜底。PR 使用精确 merge SHA 和事件 base SHA，在隔离托管 runner 上运行，只读权限且不持久化凭据；新提交取消同 PR 的旧 advisory。Node 固定 24.18.0。Full路径当前实测主耗时为测试本身，不能为了初始化优化破坏完整测试依赖。

混合未知输入的 advisory 在一次图分析中求全部静态映射，不按每个变更文件重复解析全库；未映射输入不会触发额外动态扩集。只复用本次调用的内存闭包，不缓存跨调用源码或报告。CLI 的 `planDurationMs` 和 plan/build/tests 阶段耗时用于区分规划、初始化与真实执行，失败也保留阶段耗时。

基准：真实GitHub run40708754842，SHA53fa164a，创建14:43:27至完成15:04:40 UTC，21分13秒（含排队）。原始jobs和ruleset保存在docs/evidence/ci-fast/。

验收口径：按固定工作流版本采集自然PR运行，分别报告Fast/Full样本数、SHA、attempt、结论、创建到最后Required Check完成的耗时，以及各job排队/执行时间。P50/P90用nearest-rank；失败和取消单列，不从样本中静默删除，不用重跑历史SHA刷样本。Fast至少20个真实PR样本且覆盖源码、测试和纯文档后判断P50≤300秒、P90≤600秒；未达样本量只报告观测值，不宣布总体达标。M7本轮只验真实安全Fast入队和Full组合/合后阻断链路，不把Full总耗时≤1800秒作为收口目标，也不为此追加调优；Full 作业与所有子进程预算、完整回归和门禁保持。

美术输入分两组：原六张审阅 PNG 仍仅由审阅测试/许可审计准备，预算 5983528 字节；运行时只准备固定三张卡牌预览和一张背景预览，独立上限 181870 字节。JS 测试会通过辅助模块/子进程开启美术，因此 Full 分片与 Fast 对非空 JS 集合保守准备这四项；纯文字、空集合、仅 Lua 和默认关闭美术的 presentation 构建不新增下载。两组共用本地 LFS 对象缓存，重叠三张预览不重复传输；读取前核对索引指针，读取后核对 PNG、长度及 SHA。这里的字节数是逻辑输入上限，不是实际计费读数。



## 普通 Release 的交付验证（工具候选）

普通Release修复沿原入口 `npm run verify:delivery -- <PR号> <精确独审.json>` 采集schema3的Release kind。它读取主仓PR、当前Release ref、主PR的完整Full或双平台Fast及不可变checkout/plan、License唯一inventory，保存精确HEAD/BASE/tested/tree；Fork预检不替代该证明。当前工具可在独立审查树读取实际主PR，不要求先把工具增量推入正在验收的候选。

实际合入后，用保存的本轮凭证运行 `npm run verify:delivery -- <PR号> <preflight-evidence.json> --merged --read-only`，重验主PR最新运行及实际squash parent/tree、Release分支归属，输出本地merged证据。普通Release不要求不存在的push Full或develop队列。读回通过才算该源组合合后验证；这不替代正式冻结版Full、官方ready或设备验收。

去掉 `--read-only` 时仍执行原Backlog计划：需在实际当前Release checkout运行，保持任务快照、未验AC与owner，明确 `Backlog:` disposition后由CLI写入并读回。原develop/master、schema2–8及Release→master冻结Full门禁不变。本节工具尚为独立本地候选，不能据此声称主仓入口已上线。

永久入口准备在既有 #677 的独立后继，保留其develop队列授权与旧来源；尚未落地的 #712 不作为已上线依赖。不修改正在验收的Release候选。当前可从独立已审工具树读取703/707真实主PR。

启用原生auto时，应在PR仍open且主Quality/License已关联后保存一次。未完成CI只保存 `pr_pending`：精确独审、open HEAD/BASE/tested/tree、独立Release ref和主运行身份，不称 `pr_passed`，也没有伪造checkout。命令会输出保存路径并以非零退出；保留该真实凭证。合后用同一凭证运行上述只读入口，鲜读同候选成功Quality/不可变checkout/License与实际squash，方能得到 `merged_passed`。原pending记录保持原样，不倒填合前成功，也不靠关闭auto抢采集时机。
