# M8 敌方说明入口对照

用同一个离线 Lua Host 探针，按正式布局参数生成 UI（officialAssets、精绘怪物、nativePageLifecycle）。场景为 seed 2 的大颚虫（运行时 ID jaw_worm，实际首招 jaw_worm_1）。分别触发 1280×720 PC 悬停、844×390 模拟触屏点按中的本体、意图和血条控件；每次使用新战斗并确认战斗规则状态、当前目标不变。

| 源码 | PC | 模拟触屏 |
| --- | --- | --- |
| Develop `73c21489efaab409d4c0c46bee517d410d3427fc`（树 `94b454e6419c3c0c288eaafb0b4667821deabaae`） | 本体没有悬停入口；意图走旧大框；没有独立血条命中区 | 本体打开旧通用状态框；意图打开不同模式的旧大框；没有独立血条命中区 |
| Release `0586dd9ce94423e17cab5f9a9ff2df54689dbe64`（含 #925） | 三处均显示同一紧凑说明 | 三处均显示同一紧凑说明 |

Release 三处均显示「攻势 / 这名敌人将要 / 攻击造成 11 点伤害。」，关联大颚虫自身，旧大框不显示。Develop 两种输入均观察到 parity=false；Release 两种均为 true。此处 RED 是探针打印的行为差异，探针本身完成运行并退出 0。不代表官方客户端命中、裁字、设备性能或全部敌方招式验收。没有改动生产文件、没有启动 Full。

从包含本证据的 Git 根运行（先按仓库现行方式安装依赖及展开必要 Git LFS）：

```sh
node docs/evidence/m8-enemy-detail-parity-20261123/probe.mjs
node docs/evidence/m8-enemy-detail-parity-20261123/probe.mjs <另一份已准备的checkout目录>
```

不传目录时，以证据所在仓库为源码目录。探针仅向临时目录写生成物，退出后清理。两次证据来源分别见 `develop.log` 和 `release.log`。
