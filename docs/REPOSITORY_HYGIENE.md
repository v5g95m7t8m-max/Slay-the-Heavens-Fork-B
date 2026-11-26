# Fork B 仓库职责

本公开仓库承担 STH 的美术生产、拟合实验与候选设计。长期纳入 Git 的材料包括美术生产工具、可公开的候选设计与拟合输入、具备公开权利的中间资产。重型 CI、压力测试和性能分析交给 Fork A。

| 仓库 | 职责 |
| --- | --- |
| [主仓库](https://github.com/FurinyaWorks/Slay-the-Heavens) | 正式源码、产品决策、共享 Backlog、有效设计规范、正式资产、必要测试及精简验收证据。 |
| [Fork A](https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A) | 重型 CI、压力测试、性能分析及工程技术实验。 |
| [Fork B](https://github.com/v5g95m7t8m-max/Slay-the-Heavens-Fork-B) | 美术生产、拟合实验、候选设计与可公开的美术中间资产。 |

当前 CI 验证仍采用 A 优先运行 Quick/Fast、B 优先承担高风险 Full 的分流。A 的工程专项可按需运行重型验证。正式集成继续遵守主仓既有的全部必经检查。

## 保存与回流

- 临时日志、报告、截图、可再生成的构建物及运行快照优先存为 CI Artifacts，记录运行 ID、源 SHA 和保留期。含敏感信息、未脱敏存档或缺乏公开权利的素材仅使用受控私有存储。Fork 为公开仓库，上传前核对提交、祖先、附件和可访问的 LFS 对象。受限数据同样不进入公开仓库的 CI Artifacts。
- 长期保留的实验输入应记录来源、许可、版本、完整提交 SHA、运行命令及负责人。候选方案标注状态，供评审使用。主仓库的正式资产和验收证据需记录已批准版本、完整 SHA、来源与当前有效性，必要资产由主仓独立提供。
- 回流在共享 Backlog 登记，由主仓维护者逐项审查可公开的正式交付和必要验证。在已核对公开权限的 Fork 推广分支收敛最终提交，将同一个提交同步到主仓集成短分支。PR 正文写入 `Fork-Source: <owner/repo> <refs/heads/branch> <40位SHA>`，并提供目标版本、采纳路径、许可及验证结果。源分支保持在审核 SHA，直到合并完成。正式 PR 使用主仓的独立评审、当前 HEAD 的必经检查及合并队列。
- 批量同步前核对主仓和本 Fork 的树及提交范围，筛出公开存储禁入内容与尚在途的分支。保留可复现的历史证据和有独立工作的分支。

## 首轮库存

基线 `c3b9984c24a8dd168d73215ec50d1e6a90df7a8d`，跟踪 10,378 文件，Git blob 计 272,274,795 字节，LFS 媒体仅计指针。`docs/evidence` 3,217 文件、`docs/reviews` 675 文件、`experiments` 251 文件、`.artifacts` 34 文件、`.dream-loop` 2 文件。

- `.dream-loop/menu80-plan.md` 是一次菜单配色实验的自审计划。现行构建、测试、许可清单与设计文档均无该路径的消费者。历史保存清单已有对它的引用，从本分支删除后可从 [原提交](https://github.com/v5g95m7t8m-max/Slay-the-Heavens-Fork-B/blob/c3b9984c24a8dd168d73215ec50d1e6a90df7a8d/.dream-loop/menu80-plan.md) 查阅。
- `.artifacts` 的 LFS 媒体及 `.dream-loop/menu80-target-land.png` 仍受媒体精确清单、存储校验和许可清单约束。迁移前需要核对证据引用和可读 LFS 对象，保留完整摘要及归档来源后同步更新清单。
- `docs/evidence` 和 `docs/reviews` 中保留必要的复现夹具、唯一验收证据及固定 SHA 引用。逐项核对原始运行日志、导出及过时草稿的依赖和留存。`experiments` 的开发输入按职责分流，需同时保全生成命令与许可。原始平台日志包待核实私有保管与脱敏方案。

现行树移除地图专项原始压缩存档（1,547,688 字节）。摘要、对照图与复现入口保留，源对象 SHA-256 为 `417e18607da2c9363cea607a4b6268d8be2f231eea575002c064f0df49d8977c`。

移除下列未被现行文本路径引用的重复压缩日志，保留逐字节一致的副本。路径相对于 `docs/evidence/`。

| 移除 | 保留 | Git blob |
| --- | --- | --- |
| battle-queue-integration-20261111/licenses.log.gz | battle-piles-final-20261111/license-final.log.gz | `9a714d8e3ea48d75c0880c2a2ac76ed383d84a6a` |
| m7-golden-idol-20261109/verify-backlog-final.log.gz | ci-draft-history-20261109/backlog-verify.log.gz | `a1ca2659a267d1b60f4a57008f7f500a57191a2a` |
| official-ui-repair-20261112/backlog-r2.log.gz | noncombat-v25-20261111/low-pixel/backlog.log.gz | `e6b019a2a223fca95842dd271eae6c5dfd88cb97` |

治理进度见主仓共享 Backlog `TASK-116`。
