# Develop 怪物当前意图回流：人工制品相邻回归

基线：`73c21489efaab409d4c0c46bee517d410d3427fc`。依次应用同目录树的 `develop-staging/develop-73c-candidate.patch`（Git blob `9b093c`）和 `develop-neighbors/neighbors.patch`（Git blob `8561a2`）。先运行 `node --test tests/intent-artifact-preview.test.mjs`，再应用本目录 `artifact-neighbor.patch`（SHA-256 `0de77aa4edec8b2648d01da300677ea50307b41da0feaa727108a92139c9e7a8`），重跑同一命令。候选所用 Node 依赖与 lockfile 一致，不需要 LFS。

旧回归把次序预测的「虚弱」明细直接当作实际怪物面板文案，在候选树上 0/1。调整后 1/1，7 个 Lua 夹具共 15 例，约 63 秒，未增加超时。测试分别核对：实际怪物面板显示本回合策略与 4 点伤害；玩家面板独立显示人工制品与虚弱；旧次序模型继续核对被抵挡的虚弱、10/15 点伤害以及 15/13/9 点格挡；带 2 次人工制品完整结算，带 1 次仍报溢出，模拟不改动当前战斗。

反向验证（改动均恢复）：在 `abyss_battle_info_content.lua` 的紧凑提示行写入次序预测，单跑 `intent_artifact_preview.lua` 仍会失败；在 `abyss_actor.lua` 删除早期门控里的 `Artifact.consume(state, actor, id);`，单跑 `intent_artifact_debuff_gates_slice_2.lua` 会因单层耗尽后的溢出不再暴露而失败。日志仅归一化本地绝对路径。

本次四个补丁路径都是测试。仅为离线验证，不是 Full、官方导入或设备测试，不修改药水拖拽策略，也不变动 Develop/Release。
