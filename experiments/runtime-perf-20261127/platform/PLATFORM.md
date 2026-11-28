# 原生桥接与资源生命周期：当前源码 Host 观测

输入：`develop 32a15219aecd145c59cb1b2fcf477e5556766e5d`。复用仓库生产参数生成布局及模板，绑定本地模板 ID，经实际 Lua `OnStart`、监听器、`OnUpdate` 和 `OnDestroy`。Node/Fengari + 原生合约替身，移动画布 1560×720，种子 42，十张牌、首战一敌。不是历史十牌双敌 SDK 场景，不是从 GIL 读回，不是正式客户端。

| 阶段 | 替身已存活 / 按层级可见 | 额外桥接计数 |
| --- | ---: | --- |
| 冷启动 | 25,689 / 1,849 | 24 次画布尺寸查询；42 套怪物绑定中 0 套解码 |
| 首次战斗 | 26,317 / 2,282 | 474 次模板实例化，增加 628 个节点；解码 1 套 |
| 十张牌及 60 次更新 | 26,317 / 3,222 | 60 次尺寸查询、61 次鼠标位置查询；0 次模板实例化 |
| 三次出牌及反馈结束 | 26,317 / 2,608 | 66 次尺寸查询、88 次位置查询、25 次设备查询；0 次模板实例化 |
| 冷开 75 张卡组 | 29,477 / 4,290 | 60 次模板实例化（10 卡根 + 50 分段），增加 3,160 个节点 |
| 关卡组 → 暖开卡组 | 29,477 / 2,602 → 4,290 | 0 次实例化；暖开 3 次调度 |
| 模拟引擎先销毁 → `OnDestroy` | 0 / 0 | 1 次关闭调度；死替身仍可被保留引用访问，不能据此判断 GC |

独立的未扩展计数版本：十张手牌及 60 次更新 13,204 次替身方法、26,126 次字段写入；三次出牌及反馈结束 57,240 次方法、65,902 次字段写入、3 次事务快照，其中 `GetChild` 33,702、`SetVisible` 11,300。方法内部也可能写字段，不相加。上述是包含前后显示与调度的批次计数，不能除以出牌次数当成同步调用成本。一次 stock Host 进程 RSS 水位约 942 MiB，包含整棵 Node/Fengari 替身树和新旧 Host；不是 LuaHost 或设备 RAM。输出包含两次的阶段累计墙钟；计数与遍历会影响测量和软预算调度，stock/trace 不是优化 A/B。

## 对架构图的校准

- 原生输入监听经 `abyss_battle_action_bindings.lua` 和 `abyss_battle_input_state.lua` 到 `abyss_battle_actions.lua`，核心边界是 Run/Combat 的事务提交，不能把 hover 与真实提交都标成一次逻辑命令。
- `abyss_battle_render.lua:16` 的多项 Lua 投影将状态下发给控件；`abyss_ui.lua:256–305` 将控件实例化/释放、可选 Tween、光标与音频接口注入。场景更新还经过 `OnUpdate:349` 的画布查询、页面准备和提交。拆开重复投影、替身调用量和官方 API 墙钟，无法从前两项推导第三项。
- 该源码 Host 没有提供 `game.Tween`，也没有真实 GPU、原生控件桥延时、音频输出或最终像素。原生 Tween/资源桥/可见反馈的真实性能待同一 GIL 的官方客户端测量。
- 如要减少画布尺寸查询，先证明有可替代且不漏横竖屏/缩放/重入的原生通知；现在不优化安全性不明的查询。暖开没有重建，先不要另建对象池，优先量化出牌内真实冗余投影。
- 静态描述符、已实例化、层级可见、实际屏幕可见、引擎容量诊断是五个不同口径。最终平台图保留空项，不把层级可见计数减去官方上限当成已测容量余量。

## 复现（独立工作树）

先从内容寻址缓存恢复经过 SHA-256 和字节数验证的原版 LFS 文件，例如两张批准立绘 PNG；不放宽检查。构建默认资料供夹具加载，另生成生产选项。只在第二次测量临时应用夹具补丁，从未修改生产源码。

```bash
lab=experiments/runtime-perf-20261127/platform
npm run build:data && npm run build:ui
mkdir -p build/platform-official
node scripts/runtime-baseline/production-inputs.mjs build/platform-official > platform-profile-config.log
node scripts/runtime-baseline/worker.mjs build/platform-official > platform-official.log
git apply "$lab/platform-fixture-trace.patch"
node scripts/runtime-baseline/worker.mjs build/platform-official > platform-official-trace.log
git apply -R "$lab/platform-fixture-trace.patch"
node "$lab/pack-platform.cjs"
```

历史对照见 `docs/evidence/battle-input-performance-20261110/README.md` 和 `docs/evidence/v2.1.1-performance-20261125/runtime/RUNTIME-PROFILE.md`。本轮平台侧结论是 **NO-GO 进入正式集成（无官方测量或平台侧 A/B）**，但适合作为离线原生调用层线索及约束。
