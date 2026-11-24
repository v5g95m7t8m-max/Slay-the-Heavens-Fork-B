# TASK-4.7 补充证据：营地与宝箱的遗物详情往返

- 本地使用正式生成 `officialAssets=true, nativePageLifecycle=true`，真实生产 Lua Host 与节点点击回调；不是官方客户端、触屏设备、发布验收。
- `camp-treasure-check.lua` 从合法地图边投影到营地 f6_l1 / 宝箱 f9_l1 前的检查点，最终节点用既有生产点击回调进入。不是自然完整跑局。测试预置第二件遗物 Omamori，核顶栏计数、点击准确身份、上一件、遮挡与关闭，比较整 Run 与地图快照。关闭后拒绝旧触点、接受新触点，营地休息恢复 HP、宝箱确认打开。夹具仅补真实平台已有 Enter/Exit/EndDrag 事件枚举；不更改产品逻辑。
- 主仓 Develop `79abbb50ec5ed0b536db5c8961a0593352758b74` 对照：营地通过，宝箱旧按下跨遗物详情返回后误开。叠加本分支已有 `1bae4f5b598bf0db0115dc129ea1d22c611c428d` 的单生产文件改动后两者均通过。此次提交只保存复验，无新修复。
- 同一已有补丁可干净应用到 [主仓 #912](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/912) 合成 `9a153a2677082903f3a5b6af79e588971e0c7f77`（head `88455d76` / base `79abbb50`）；保留 #912 商店指针守卫。组合只跑上述 2 条离线路径，不可替代独审、源回放锁或精确 Full。
- 重跑：在相应归档内按 `fixture-enums.patch` 补测试夹具 Enum，沿用 `tests/sts-page-reveal.test.mjs` 的布局/数据生成，然后设置 `LUA_PATH='gen/?.lua;src/lua/?.lua;;'` 并用 Fengari 运行此 Lua。必须看到两条 `M8_TASK_4_7_PASS`，不只看 Lua CLI 退出码。
- TASK-4.7 AC2/3/6 保持未勾，设备、更多遗物集、真实触点几何以及全局恢复不由此单测代替。
