# M8 TASK-16.1.5：连锁死亡时的奖励揭幕

基于上游 Develop `73c21489efaab409d4c0c46bee517d410d3427fc`，复用同目录 [多敌同时致死验证](README.md) 的正式生成布局及 Host 夹具。使用真实 Strike 和 Corpse Explosion 死亡触发器，受控设置青铜球与邪教徒各 1 HP；两种战斗 dispatcher 分别运行。不是旅行者自然牌组、Silent 全局验收或官方设备。

| 对象 | 致死接触可见帧 | 退场帧 |
|---|---:|---:|
| 青铜球（直接击杀） | 13 | 35 |
| 邪教徒（死亡触发连锁击杀） | 27 | 49 |
| 奖励 | 49 | — |

两个正向均 PASS。第 49 帧内用测试引擎事件序号验证：最后一个敌人完成销毁（2），再设置奖励控件可见（3）。陪测原 `death_power_order.lua` 11 组通过。胜利声和奖励出现各一次，8 帧内无额外横幅/遮罩或回退；金币首帧可领，重复点击不发放。强制在第一次致死接触时显示奖励，两种负控均在目标断言失败（退出 2）。没有实机时间、画面、真实点按或其他未测场景结论。

从同一根目录完成 `npm ci`、`npm run build:data`、`npm run build:ui`、`npm run build:theme`。按下方命令测试四种组合：`dispatcher=native|advanced` 、`mode=positive|early`。预期 positive 退出 0 并显示 `CHAIN_LETHAL_REWARD_PASS`，early 退出 2 且错误包含 `rewards revealed before all lethal actors retired`。脚本 SHA-256：`c617cefcadc5f6a23db292095a6745a726ed3dd355ee56badf4835f6d3c16f8f`。

```sh
mode=positive dispatcher=native probe=docs/evidence/m8-multilethal-reward-20261123/chain-lethal-reward.lua node_modules/.bin/fengari -e 'package.path="build/lua/?.lua;src/lua/?.lua;"..package.path; arg={os.getenv("mode"),os.getenv("dispatcher")}; local ok,why=xpcall(function()dofile(os.getenv("probe"))end,debug.traceback); if not ok then print(why); os.exit(2)end'
```
