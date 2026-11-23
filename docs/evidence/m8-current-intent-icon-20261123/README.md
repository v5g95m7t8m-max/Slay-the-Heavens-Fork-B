# TASK-74.1 第一片：头顶意图与详情共用实显

基线 `73c21489efaab409d4c0c46bee517d410d3427fc`。只修改现有头顶意图点击/悬停入口；详情读取同一战斗、同一敌人实例已绘制的数值。没有绑定血条或轮廓、改布局、药水策略、战斗或预测。无来源标记的敌人保留原预测说明；来源快照不存在或已失效时不以预测顶替。

正式资源离线 Host：旧版头顶 11、说明 7；候选在鼠标和模拟触屏均 11，刺击之书显示每击 6、共 3 次（不是 18）。验证新战斗与同战斗更换实例前不读旧快照、符文圆顶隐藏及旧式敌人的 5/8 两段不变。直接运行 `node docs/evidence/m8-current-intent-icon-20261123/native-official.mjs`（仓库根）。

`node --test tests/current-enemy-intent-tooltip.test.mjs tests/intent-artifact-preview.test.mjs tests/boss-relics-missing.test.mjs tests/monster-intent-particle-game-ui.test.mjs tests/source-intent-descriptor.test.mjs`：6/6。分别运行 Lua `status_help.lua`（8/8）和 `potion_status_rules.lua`（10/10），仍查详细预测的时长、状态与效果，不再误用现有意图面板作为预测来源。候选 Lua 静态检查和依赖检查通过。4 个生产文件 79 行；独立源码复核通过。此分支用于续测，尚未做要求的 Full、官方导入或实机，不是完整三触点回流。
