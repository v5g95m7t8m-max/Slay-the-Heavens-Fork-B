# Develop 药水拖动与怪物详情的输入回归

在 Develop `73c21489efaab409d4c0c46bee517d410d3427fc` 应用 `develop-staging/develop-73c-candidate.patch`、`develop-neighbors/neighbors.patch`、`develop-artifact/artifact-neighbor.patch`。在同一工作树比较应用本目录 `develop-legacy-drag.patch` 前后。仅改最后一个测试用例；前 10 个测试，包括点选药水瞄准，保持原样。

在仓库根运行：`node docs/evidence/m8-enemy-detail-parity-20261123/develop-legacy-drag/native-official.mjs .`（沿用正式资产、精修怪物和 nativePageLifecycle 的离线生成界面）；默认生成界面运行 `node scripts/build-lua-data.mjs && node scripts/build-ui.mjs && node scripts/map-ui-layout.mjs && node --test tests/approved-enemy-details.test.mjs`。正式配置旧断言 10/11（继承自 Release 的取消预期），新断言 11/11；默认 Node 2/2 含全部 11 个 Lua 用例与容量 guard。日志摘录省略生成资源警告并清除工作目录前缀。

真实拖动中依次触发轮廓、意图和血条：不出详情，不改变移动令牌、战斗或药水。合法抬手只造成一次 6 点牌伤害或一次 20 点药水伤害；第二瓶保留，重复抬手/点击无二次消耗。反向控制预加载两份单点变体：详情点击强行清空移动中的药水瞄准令牌会在意图触点失败；把合法 `owner:commitPotion(aim.slot,target)` 替换为 `dependencies.cancelPotionAim();accepted=false` 会在结算断言失败。生产源不修改。

Release #908 的正式配置仍按原规则取消药水拖动，现有 Release 证据及断言不变。此提交仅归档 Develop 的离线回归，不是 Full、官方导入或实机，也不代表整批回流可以合并。

补丁 SHA-256：`49bf047390e41c5baa610239d1dca7d66ab3e014618bac79b1d3f6bcace0cd0e`。原始前后日志 SHA-256：`8b9994314087a2d7ecf77b13c94620e5c00479a67af8b8109ef6966743289ebf` / `b05a0886abeb3344fc865048bc345a538448b4f775fef73377e45775a7a5d227`。
