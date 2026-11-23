# Develop 历史回放卡点：#907

范围：#907 的 HEAD `00cd3aef7830b05cefdbb8ddd44f6110ae4ba487`，共同 Develop 基线 `73c21489efaab409d4c0c46bee517d410d3427fc`。本目录是诊断，未改历史快照、生产、工作流或在途 PR。

1. [#907 POSIX 1](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45054582954/job/137314273819) 的文字修复已经消掉原字形失败；另一条牌库行为回放与 [同一 Develop 基线](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45051445258/job/137301632513) 都先失败于商店测试文本身份。另有 [#909 POSIX 8](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45097609735/job/137441067525) 职业名单回放报同一个商店来源错误，说明这不是某条牌库断言的局部问题。
2. 隔离执行 `node --test tests/deck-browse-filters.test.mjs` 复现。仅临时应用 `admission.patch` 的精确 #859 文本和两种指纹，原命令越过第一关；8 个边界对照见日志。另跑 `tests/shop-dismiss.test.mjs`，商店布局断言通过。下一道停在资产清单。
3. 从同一已经临时通过第一关的隔离目录执行 `node docs/evidence/develop-history-admission-20261123/trace-ledger.mjs`。探针仅在内存复用已有预检的精确两处逆转换，校验新、中间与历史版本的 SHA-256 和 Git blob。既有档案仓储记录保留到原逆转换读取；LF/CRLF 接受、额外一换行拒绝。此时下一道停在 `tests/helpers/copy-integration-source-closure.mjs` 的原有指纹约束。未重写后者。

仍未执行到真实牌库操作或职业名单行为。补丁只能作为第一层候选，不可单独当作 CI 修复。建议由负责历史回放的维护者把三层按准确前序一起复核；不扩大 #907 的排版范围，也不重跑 Full。
