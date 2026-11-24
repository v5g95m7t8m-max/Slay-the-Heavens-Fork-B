# Fork 预检（Push 自动触发）

保留 Fork A / Fork B 作为隔离开发和预检算力池；主仓 `develop` 继续负责 Required Checks、独立审查、Merge Queue 和发布。Fork 结果只作诊断，不替代正式 CI。

1. 从最新主仓 `develop` 建任务短分支，先用 `node scripts/test-affected.mjs --plan --base <BASE>` 估算影响。推送 Fork A 后，`quick-feedback.yml` 自动执行 advisory Quick（全部映射 Fast JS 与按 90 秒 Lua 调度估算筛选的子集；自动作业硬上限 10 分钟，不是整体 90 秒期限）；仅修改 Markdown 的推送不启动 Quick。
2. Quick 在运行时固定主仓 `develop` 的比较 BASE，记录 HEAD/BASE；新 Push 取消同分支旧运行。比较 BASE 可能随主仓推进，不冒充开发初始基线。
3. 只有核心路径、共享 CI 或覆盖未知等风险要求 Full 时，把同一候选推到 Fork B 的 `ci/full/<task>` 短分支；`quality.yml` 自动运行 hosted Full。不要对普通任务重复启动 Full。
   Fork B 的比较 BASE 记在 impact 作业摘要，并经输出传给首个 rules 分片的质量棘轮；该分片从固定主仓获取此精确 SHA，首次 Push 的全零 before 不作棘轮基线；其 Full checkout 收据仍按正式 Push 合同记录 `event.before`，不把两者混为同一基线。Fork A 自动 Quick 只写 advisory 摘要，不生成或上传完整 preflight 收据；integration 和延后的 Lua 仍需正式 Full。手动 `workflow_dispatch` 保留原完整 `--preflight`、30 分钟作业上限及记录实际选测 BASE 的收据和 artifact。
4. 验证后同步精确候选到主仓短分支，创建同仓 PR，继续正式 Quality/Licenses、独立 Review 与 Merge Queue Full。

```sh
git push fork-a HEAD:refs/heads/<task-branch>       # 自动 Quick
# 仅确有必要时：
git push fork-b HEAD:refs/heads/ci/full/<task-name>  # 自动 Full
```

**新任务分支必须从包含本配置的最新主仓 `develop` 创建**，因为 GitHub 使用被 Push 提交内的工作流定义。旧分支不强行改写历史，可按正常主仓 PR 的自动检查交付。手动 `workflow_dispatch` 只保留为诊断回退，不作为常规合并前置条件；不需要 Agent 拥有 `Actions: Write`。

固定仓库 ID：主1429751262、A1460097312、B1460133275。复用现有 hosted Runner 与同 ref concurrency。查重使用固定 HEAD/BASE/run/attempt；Fork 的 Quick/Full 不取代主仓 PR merge SHA、队列组合 SHA 和发布证据。官方导入及实体设备仍按对应验收合同独立验证。

失败先读准确 run/attempt 的失败步骤：代码冲突、断言失败、无 runner 的排队、权限拒绝和队列退出分别接续。记录作业创建到分配 runner 的等待与实际执行时长；未分配 runner 不计执行。原 HEAD/BASE 已成功或仍在途不重复派发，修复后沿原 PR 推进；入队/本地通过不记交付，实际合并后再用已有交付验证器核验并确认无独有工作才清理。正式候选先定稿版本和 CHANGELOG，再冻结做必要 Full/构建；官方和设备缺项保持未验，不前移为普通 PR 门槛。

统计复用 `scripts/ci-run-costs.mjs`，仅按需运行，见[基线](evidence/ci-preflight-20261117/history.md)。额外来源、SHA、历史或证据防护先针对已发生的故障做最小修复，再比较实际拦截、runner 时间和维护返工；没有收益证据就先保留诊断，不默认升级强制门禁。不为这条原则新增检查、报表平台或每 PR 填表。
