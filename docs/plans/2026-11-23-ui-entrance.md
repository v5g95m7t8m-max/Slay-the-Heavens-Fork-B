# 商店与选角入场生命周期

## 需求

以 develop `73c21489efaab409d4c0c46bee517d410d3427fc` 核对已合入的商店房间与选角三态，接续 #838、#812 及 TASK-111。正式布局沿用项目资产与排布。两处入场按各自原版更新序列实施，资源预算以稳定首帧与小量原生写入为准。 [商店 #838](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/838) · [选角 #812](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/812) · [设计参数](../design/UI_DESIGN.md#商店与选角入场)

## 实体与所有权

| 状态 | 所有者与写入边界 |
|---|---|
| 商店节点、报价及交易 | 原有 Run 和 Nodes 命令持有库存、消费、随机流与完成状态。NodeUI 根据 run、map 和节点切换失效。 |
| 商店货架投影 | ShopUI 在房间投影时绘制静态货架，并绑定当前 view、actions、逐槽库存引用。报价签名包含价格、商品状态、金币、药水容量、删牌价格与资格。相同报价可复用视觉，绑定仍须与当前对象一致。 |
| 商店动画与输入 | NodeUI 商店更新写摊布、商品父层、普通关闭按钮与单遮罩。二级选择和挂起遗物接管底栏。按下／抬起、拖动撤销、触点与 epoch 合同覆盖重开、覆盖层和 run 切换。 |
| 选角准备与发布 | PageReveal 持有 ready 检查、epoch 和已发布意图。局部准备保留旧画面，已发布选角中可继续点角色或取消。确认和牌组操作等待当前目标发布。 |
| 选角资料与人物 | 资料组按角色键复用，退屏后释放。人物宿主的内部容器由原生立绘准备器持有，外层显隐由选角入场控制器在发布时写入。退出或暂停时恢复白色的完整景图，继续时恢复相位。 |

## 方案与结构

商店开店同帧先定位摊布，商品以隐藏等效原版屏外初值。点击事件外于页面 update，合成一次 1/60 秒按钮和线性遮罩更新。商品于后续商店 update 可交互。摊布和上一参考步商品组共用一个父层，子层偏移是两次采样之差。黑幕位于商人房间图层之上和货架、HUD 之下。关闭时隐藏货架，原地保留遮罩当前值供退场或重开。关闭轨结束后复用同一个原生按钮承载房间离开。接受开店时请求现有原生短音编号 50923，对应原版触发时机。该音色为千星资源映射。 [原版商店源码](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/shop/ShopScreen.java) · [原版遮罩源码](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/core/OverlayMenu.java)

选角首开取消位置从隐藏端开始。真实发布角色选择时，资料、确认与背景先前进一参考步，对应原版选项循环内确认选择。向高索引切换时，旧资料在发布帧仍按旧目标更新。换角后背景权重持续由同一条收敛轨推进。资料组仅包含信息和既有摘要，人物图与可交互头像保留自己的原生布局。正式 CLI 构建使用一组资料，显式开发布局使用八组。 [角色循环](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/screens/charSelect/CharacterSelectScreen.java) · [选项更新](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/screens/charSelect/CharacterOption.java)

背景合成中 `a` 是新人物权重，`d` 是菜单压暗值。黑图使用 `b=(1-a)*d`，原景图使用 `l=(1-a)*(1-d)/(1-b)`，分母为零时 `l=0`。原生 alpha 按 `floor(value*255+.5)` 编码。合成等价依赖 107271 的屏幕使用范围全不透明。生成布局已核对覆盖范围，纹理透明度留待读取千星 atlas。真实发布前外层容器关闭，立绘原生准备完成也不会提前显露。 [原版菜单压暗](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/screens/mainMenu/MainMenuScreen.java) · [原生检查脚本](../../scripts/verify-character-selection.mjs)

## 步骤与规则

1. 调用原有房间投影准备报价和卡面，并由正常 PageReveal 检查原生资源。关闭和重开使用同一场景与快照，直到库存或资格变化。对象更换时重绑动作。
2. 轨迹由现有统一 update 推进。正常运动每次最多更新三个商店 transform 和一张黑图。选角把运动写入按钮、活动资料组和两层背景，开发布局另外更新单张备用人物图。
3. 原版 60 Hz 递推独立产生对照值。共同经历 6、12、18、36 步的摊布位置为 640.756、380.155、225.543、47.102 像素，按钮偏移依次为 −150.860、−56.897、−21.459、−1.151 像素。按钮第 37 步吸附，摊布第 89 步吸附。开店时按钮的先行一步单独计入。
4. 通过商店和选角的离线回归后，正式准入沿用精确候选的独立评审、Required Checks 与原生 Merge Queue。设备测量记录实际房间可点、首个呈现帧与第一笔可买输入的间隔。 [准入合同](../CI.md#pr-自动合并准入)

### 离线成本记录

| 项目 | 30 Hz | 60 Hz | 120 Hz |
|---|---:|---:|---:|
| 一次冷展开和完整收尾的摊布定位写入 | 46 | 90 | 178 |
| 商品父层定位写入 | 45 | 90 | 179 |
| 每张卡首次名称写入 | 1 | 1 | 1 |
| 相同报价暖重开的额外卡面构建 | 0 | 0 | 0 |

正式布局在原有静态树上增六个控件，其中黑幕两张，容器四个。原生人物已存在的 1600 个图元由原准备器首次创建，发布与入场循环不逐片写色。常态没有新增动画依赖或更新入口。以上计数来自离线布局和 Lua 宿主。

## 验收命令与证据

- `npm run build:data && npm run build:ui && npm run build:theme` 生成默认布局和实际运行数据。 `node scripts/build-ui.mjs build/official-entrance --official-assets --native-page-lifecycle` 生成正式样式和单角色资料组。
- `node --test tests/character-selection-exit.test.mjs` 检查真实宿主选角发布、暂停和快速切换。 `node --test --test-name-pattern='official selection only exposes|official mobile shop map return' tests/official-assets-runtime.test.mjs` 检查正式样式的就绪门控、两张图 alpha 编码与移动端导航返回手势。
- `tests/lua/shop_entry.lua` 经 `scripts/test-lua.mjs` 的 `runLua` 执行独立原版递推对照，覆盖 30/60/120 Hz、冷开首次呈现、暖缓存、新手势购物、删除与离开。离线冷开只绘制一次七张卡。相同报价的暖重开额外绘制 0 次。
- 原版客户端录像、107271 原图透明度、千星官方导入与 ready、PC／实体手机的视觉、声音及墙钟时延待验。Lua 轨迹、默认触控夹具与生成物提供源码证据。

## 集成门禁修复

在基线和候选中分别复现了牌组同名局部变量和 HUD 奖励入口函数超限。复用已审阅实现中的局部变量改名与原有奖励入口提取，两处均保留视觉状态和写入顺序。牌库字体回归对应当前排序与翻页控件。Lua 静态和工程门禁一并验证。 [两处原补丁](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/909) · [字体断言来源](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/907)

房间与选角发布的 14 项回归通过。历史回放从精确入场源码指纹还原旧视图，原始档案保持原样。17 项定向回放通过，包括逐项拒绝漂移、删除及使用旧源码的负控。源文件恢复差异压成约 37 KB，仅测试读取。原 develop 的旧牌堆清单仍无法核对已退役的控制器及旧夹具。Fork B 的修复在四项单独复现的用例上通过，正式基线仍待接回。 [Fork B 基线验证修复](https://github.com/v5g95m7t8m-max/Slay-the-Heavens-Fork-B/tree/ci/develop-replay-repair)
