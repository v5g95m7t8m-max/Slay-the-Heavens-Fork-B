# v2.0.0 选角底板与界面参考

本条用于 `release/v2.0.0`。起始核对基线为 [09d6cc17 的正式 UI 源码](https://github.com/FurinyaWorks/Slay-the-Heavens/tree/09d6cc174d9edc1caaf64aebb4594d7bf61737f7)，构建配置为 `--refined-release-monsters --native-page-lifecycle`，逻辑视口为 1280×720。

- 选角构图及按钮字体参考初代《杀戮尖塔》PC 版 V2.0（画面角标 01-21-2020，1920×1080）。选角原图 SHA-256 为 `4828bd5150c250e0634fa6999d057ef68accd599187d24015c89b833c038a63d`。设置截图用于参考暗底层次；项目选角初始画面采用用户确认的近黑纯色。 [原作选角实机](https://interfaceingame.com/screenshots/slay-the-spire-choose-your-character/) · [选角原图](https://interfaceingame.com/wp-content/uploads/slay-the-spire/slay-the-spire-choose-your-character-1920x1080.jpg) · [原作设置实机](https://interfaceingame.com/screenshots/slay-the-spire-game-settings/)
- 原作返回和确认共用 PC 的 32 px 按钮字体，按 1920×1080 到 1280×720 折算约 21 px，常态字色为浅黄 `#FFEDA7`。这是原作字体的参考值，项目当前按钮继续使用 Release 的 24 逻辑像素和 `#FFF8E7`。 [原作字体设定记录](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/helpers/FontHelper.java#L263-L270) · [原作按钮颜色记录](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/core/Settings.java#L653-L657)
- 正式布局用一块 `#0F1117` 原生矩形作为待选、加载及失败回退的底板。同一紫色贴图此前也垫在主菜单和结算下方，现共用原有纯色底。选中后由项目现行原生角色画面接管。左栏显示生命、金币、介绍和初始遗物，当前角色槽使用原有命之座图形，放弃确认框沿用金边。
- 旧投影只用于追溯对应提交。验收应从本分支正式构建进入选角，检查待选、加载、就绪、回退与重入。当前证据来自生成布局和离线 Lua Host，千星奇域客户端和设备待验。

关联实现见 [正式选角布局](../../../../scripts/noncombat-v25-layout.mjs) 和 [正式布局回归](../../../../tests/noncombat-v25-layout.test.mjs)。
