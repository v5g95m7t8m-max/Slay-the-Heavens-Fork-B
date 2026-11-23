# TASK-16.1.5：旅行者多段攻击与过量伤害

证据基线：`73c21489efaab409d4c0c46bee517d410d3427fc`。沿用同目录 [已生成 Host 测试](README.md)，这次使用正式旅行者卡 **Twin Strike**（5 伤害 ×2），将一名敌人的 HP 设为 6。测试不强制设 HP=0，确实走两段伤害；是受控手牌与血量，不是自然种子实玩。

| 观察 | 模拟帧 |
| --- | ---: |
| 第一击后仍可见且剩 1 HP，奖励未出现 | 13 |
| 第二击过量致死，死亡反馈可见 | 26 |
| 结束动画后敌人退场；同帧先销毁、后揭幕奖励 | 48 |

重复跑正向通过，只有一次奖励和一次胜利提示，没有额外遮罩/胜利横幅，随后连续 8 帧稳定，首帧领奖不重复发金币。只在第一段未致死时用夹具提前显示奖励，负控退出 2，命中 `rewards revealed before all lethal actors retired`。没有实际设备、官方点按或显示帧率/时延结论；返图和重入已有独立测试，未重复编写。

准备方式同 [README](README.md)。在项目根目录用以下命令，`mode=positive` 应输出 `TWIN_STRIKE_OVERKILL_PASS 13 26 48 48 1 1 2 1 2`（制表符；退出 0）；替换为 `mode=early` 运行负控。脚本 SHA-256 `354562a18e2b5364a5a7efd0ef4f161a0263c6f868e5cb9f587b3219f847870a`。

```sh
mode=positive probe=docs/evidence/m8-multilethal-reward-20261123/twin-strike-overkill.lua node_modules/.bin/fengari -e 'package.path="build/lua/?.lua;src/lua/?.lua;"..package.path; arg={os.getenv("mode")}; local ok,why=xpcall(function()dofile(os.getenv("probe"))end,debug.traceback); if not ok then print(why); os.exit(2)end'
```
