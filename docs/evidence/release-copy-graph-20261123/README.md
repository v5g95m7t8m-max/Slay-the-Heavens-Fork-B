# Release 冻结图谱：#906 文案差异的定向归因

基线 `64b74fc26e26e1dc43ab571187c008f12911f371`。复用原测试的实时 VM 与冻结 VM，不改生产源码、冻结档案或 CI 判定。适用 `#908` [药水回调 CI](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45090287098/job/137418357120) 及 [遗物 CI](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45090287098/job/137418357156) 的归因；遗物仅核查 `hp` 组。

在仓库根目录先生成本地 Lua 输入，然后分别执行：

```sh
npm run build:data && npm run build:ui
node docs/evidence/release-copy-graph-20261123/graph-proof.mjs potion
node docs/evidence/release-copy-graph-20261123/graph-proof.mjs relic-hp
```

两个 VM 的原始图谱仍分别记录。仅当当前与冻结记录的同一表定义指向同一张 `bite` / `jax` 卡，且字段精确等于各自的已知新旧名称，才在比较副本映射名称。所有检查点的完整 JSON、顺序、其它字段、引用和元表继续逐字节对比；测试输出、生成输入指纹及遗物覆盖一致。当前遗物 VM 保持零预载。

| 范围 | 总检查点 | 仅名称不同 | 新名称字段 | 故意篡改均被拒绝 |
|---|---:|---:|---:|---:|
| 药水完整回调流 | 31 | 14 | 60 | 5 |
| 遗物 HP 代表组 | 512 | 7 | 14 | 5 |

五个负控覆盖错误新名称、误回旧名称、错误卡牌 ID、改费用与调换字段顺序。两个 JSON 报告包含未投影的现场与冻结完整流 SHA-256；未重跑 Full，也未验证所有遗物组或设备。此分支仅保存可复现证据，不代表 CI 已修复。
