# M8 TASK-16.1.5：多敌末击到奖励的离线验证

基线：上游 Develop `73c21489efaab409d4c0c46bee517d410d3427fc`。只追加隔离验证证据，不改变生产 Lua、共享夹具、任务归属、发版或 CI。测试沿用正式构建生成的 UI 和现有 Host 夹具，真实执行 Cleave；三个 Cultist 各 1 HP，稳定 ID 跟踪可见、反馈和退场。与既有单敌 PC13 录像验收分开。Lua 脚本 SHA-256：`7ec5e6392386f5cf41d4dc572084768989bfdc4c7435eaf908be838e36b5cf7f`。

| 敌人 | 可见致死接触帧 | 退场帧 |
|---|---:|---:|
| cultist_1 | 13 | 35 |
| cultist_2 | 14 | 36 |
| cultist_3 | 15 | 37 |

奖励第 39 帧出现，距最后退场 2 帧。只揭幕和触发胜利音效各 1 次，随后观察 8 帧未闪屏；奖励首帧可领，重复操作没再次发金币。原始 PC13 单敌夹具也通过（致死接触到奖励 22 帧）。在夹具中只把奖励控件设为在首个致死接触帧提前显示后，测试如期在提前揭幕断言失败。模拟帧由 Host 测试步进，并非真实设备或官方帧时间，不将单体上限套用到多敌。尚未验官方 PC／手机、链式死亡与全部末击场景，不勾关闭验收。

## 重跑

仓库根目录准备 `npm ci`、`npm run build:data`、`npm run build:ui`、`npm run build:theme`。从同一根目录运行下面命令，先 `mode=positive`，再把它改为 `mode=early`。预期前者 0 并见 `MULTILETHAL_REWARD_PASS`，后者 2 并见 `rewards revealed before all lethal actors retired`。

```sh
mode=positive probe=docs/evidence/m8-multilethal-reward-20261123/multilethal-reward.lua node_modules/.bin/fengari -e 'package.path="build/lua/?.lua;src/lua/?.lua;"..package.path; arg={os.getenv("mode")}; local ok,why=xpcall(function()dofile(os.getenv("probe"))end,debug.traceback); if not ok then print(why); os.exit(2)end'
```
