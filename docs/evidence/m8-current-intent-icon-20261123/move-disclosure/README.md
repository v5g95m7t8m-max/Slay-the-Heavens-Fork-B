# 头顶意图两项招式的说明边界

使用正式资源的生成界面，模拟 844×390 触屏，调用真正绑定的 Down/Up/Click。基线 Develop `73c21489`、旧候选 `fd909e1a`、Release `c4eec5f9` 通过 `reference-probe.lua` 比对，检查战斗、目标和事件随机流不变。候选回归另检查实际 `miscRng`、`treasureRng` 和 `cardRng`。

- 青铜机枢 `spawn_orbs`：旧 Develop 详情提前写两名青铜浮核；Release 和候选紧凑说明均为「意图不明」，隐藏图标但保留帮助触点，不把召唤误写成强化。单独模型仍预报两名，隔离战斗的真实回合结算也生成两名。
- 六火亡魂 `inferno`：头顶保留 `2x6`。按 Release，攻击削弱类说明只写每段 2 点伤害，不重复次数；纯攻击的刺击之书仍写每段 6、共 3 次。

从根目录运行上级 `native-official.mjs`（六项全过）、`node --test tests/current-enemy-intent-tooltip.test.mjs`（1/1）。不改 Release、血条/轮廓入口或玩法；未跑 Full 或实机。
