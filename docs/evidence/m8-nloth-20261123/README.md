# TASK-4.18 恩洛斯二次交易文案

基线 `73c21489efaab409d4c0c46bee517d410d3427fc` 的实际生成事件界面在重复交易选项写「获得圆环」，而同一次发放的遗物在结果显示「头环」。只将选项文案改为读取现有遗物名表，未改变取得遗物 ID、可选遗物、随机流、扣除顺序或离开流程。

同一离线原生控件见证：改前两种普通交易通过，重复分支因文案不一致失败；改后四条路径均通过（两种普通交易、已有礼物时保留原物并领取头环、拒绝交易）。每条验证有序库存、随机流、生命、金币、牌组及返回地图。既有中文呈现测试 1/1、换脸商/恩洛斯/骷髅共享规则 11/11。使用固定事件 ID 的定向离线 Host，不是自然随机池、官方导入或手机验收；不勾原任务的同候选设备 AC。

重跑：先运行 `node scripts/build-lua-data.mjs && node scripts/build-ui.mjs && node scripts/map-ui-layout.mjs`，然后在仓库根执行：

```sh
node --input-type=module -e 'import {runLua} from "./scripts/test-lua.mjs"; const r=runLua("docs/evidence/m8-nloth-20261123/witness.lua"); process.stdout.write(r.stdout+r.stderr); process.exitCode=r.status??1;'
node --test tests/nloth-chinese-presentation.test.mjs
```
