# PR #677：同步 fail-closed 修复而不搬 Release 独有来源层

来源 HEAD `51964793b3a6071619f25133642b3a698f753d74` / develop BASE `c2409ad750c15124b7b843c6bbfa5b222537cb75`。同一 #707 修复的 develop 接续，不修改生产、workflow、保护或历史归档。

原树定向复现两个失败：Draft/Fast partial migration 1；combined-closeout 的 draft helper 原 pin。`red-excerpt.log` 仅保存原输出的失败及汇总摘录，不冒称完整日志。原63种部分迁移与负控未删除。

- 所有逆向前保存调用者原文，拒绝时不提前删除 publication gate。
- 在本分支已有 bootstrap CI 来源层，仅将完整最终 helper SHA `357ad5c4d68378063b02cf75396f804c8c2b61d12a925595663a4b533948e4e6` 映射回原完整 SHA `5c3cc95c0371927db143c573c1500843b97ca8e138f67737aede03e558b1d986`；原历史 pin、库存保持。不搬 #707 的 selection-map 入口。
- 独审发现映射还须核对调用方 before.sha256：已保留正确前驱映射、拒绝错误前驱，新增两种换行下的正反控并复验。
- 既有 Release cases 增加 LF/CRLF、CRCRLF、追加/删首、非字符串/foreign路径及 Buffer 类型和身份负控；没有新增发现清单条目。

Node v24.22.1：summary + ci-impact 23/23，原 combined-closeout 单项 1/1；guidance/Backlog/diff-check通过。两份 LFS gz 仅恢复原 OID 内容、不入提交。没有运行本地或手动 hosted Full。独审与新 HEAD 托管结果分别核验，本地通过不代替分支保护或发布验收。

## 普通Release交付入口的677后继准备

本候选直接基于正式677 `873d4392c02fd5ac92e653e57a78fd59f6ae63c6`，target develop `c2409ad750c15124b7b843c6bbfa5b222537cb75`；正式PR head未动。三核心脚本的原始字节与operator基础791相同，因此选择性移植已审 `5332e5460604fc1f02af4e576c7a7635f0fab093` 和竞态后继 `3c943142d7f0eb35b8bb3a992bb6a68512925603`，不合Release整树、不包含未落712，也不要求它。原Full/Fast/License身份、develop/schema2–8、冻结发布及Backlog保护保持。

同schema3的Release kind支持真实open时保存 `pr_pending`，只证明精确review/head/base/tested/tree、独立target与关联主run/license，不声称成功、没有假checkout。native auto合后用原checkpoint鲜读成功main Quality/immutable receipt/License与actual squash parent/tree/Release归属；原pending不改写成合前成功。普通Release无需不存在的push Full/queue，新增显式 `--merged --read-only`。

仅六个实际改过的源文件通过677既有bootstrap来源入口接续，before逐字等正式873；完整另存5332和3c四份实际operator源。所有旧包pin/断言保留；677原delivery当前workflow断言亦原样保留。未知/部分/错before/Buffer/CRCRLF/production路径拒绝，caller fresh read及缺失/漂移负控保留。来源包不是新选择库存。

实际TDD先红；移植5332时六文件选择150/150通过，随后接入已审pending增量后的最终delivery/pr-quality/full-quality-shape/ci-impact/quick/integrated六文件 **136/136、0skip**。两轮选择不同，不合并计数；guidance/Backlog/diff-check通过。原始输出合于 `release-delivery-raw.tar.gz`，SHA256 `fc9360b422b6bfc4eaed385a25e29d7601f82038d02e880335d1240d6e2c911a`。独审必须绑定本候选准确HEAD/正式873父/develop c240，不能沿用operator或旧677的review充当此组合已审。

这是本地可审后继，未push、dispatch、新PR或Full；A359唯一Full及B7d不动。实际703 pending证据与公开产品独审由独立operator采集，不用tool review替代；本移植不伪造已上线或真实merged_passed。
