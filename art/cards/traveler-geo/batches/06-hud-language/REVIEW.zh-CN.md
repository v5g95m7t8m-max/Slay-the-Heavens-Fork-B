# 06 · 原神 HUD / 技能语言联合验证

范围：仅原创透明矢量小样。不是游戏运行截图、图元拟合或发布；不改卡框、底色、HUD 布局或运行时代码。不用这一轮批准 75 张。

## 参考与保留规则

- [手机实机 HUD，社区标注](https://github.com/Genshin-Weeb/Intro-to-Genshin/blob/main/assets/attack_graphic.png)：普攻是亮刀与暗刀压叠，跳跃是弯肢与粗上升箭头，冲刺是低斜锐形。三个动作共享安静的圆底，但不是一套等宽线条或固定几何骨架。本轮只研究符号，圆底及控件状态不进 SVG。
- [行秋 E](https://github.com/CMHopeSunshine/GenshinWikiMap/blob/7fafe2e18011008d47e347f0f68216d05da0c1f1/resources/talent/Skill_S_Xingqiu_01.png)、[诺艾尔 E](https://github.com/CMHopeSunshine/GenshinWikiMap/blob/7fafe2e18011008d47e347f0f68216d05da0c1f1/resources/talent/Skill_S_Noel_01.png)、[岩主 E](https://github.com/CMHopeSunshine/GenshinWikiMap/blob/7fafe2e18011008d47e347f0f68216d05da0c1f1/resources/talent/Skill_S_PlayerRock_01.png)：已比对技能 PNG 镜像，非官方分发。研究动作优先级、亮暗叠压、岩面切口，不移植像素、轮廓或者底色。参考图不入 Git。元素形状服务语义，不把每张图强套轮廓、环或四角星。
- 先定义动词和最接近的误读；先做最大轮廓，再加一个辅助亮度/留白。小版按用途重画，不等比压扁细节。检测顺序：独立无字盲评 → 同底色卡面 → 再谈拟合和接入。

## 两位独立评审

用同一底色与方形 52 px 图标框看卡图，另外测试 22/32 px HUD 符号；不展示名称、原稿顺序或正确答案。均为离线模拟绘制尺寸，非物理屏幕尺寸。

- 挥剑：两位都认出挥剑和 HUD 小剑；对新旧挥击线各有偏好，22 px 动作线索较弱，风格仍容易被看成通用标志。保留为对照，不作风格通过样板。
- 防御：首轮顶面像盒子。照盲评改为连续盾肩和明确收尖；两位复评都认出 22/32 px 的盾，在 22 px 不依赖内侧折面。
- 星陨剑：初稿无明确触地点，复评版新增一条落地折线，两位都在卡面和 32 px 认出落地；22 px 只可靠读到落石，若要求读出撞地则不通过。仓库 ID cleave 对应本作星陨剑，不把原版名字的横扫强套在本作岩落语义上。

结论：小样部分通过尺寸可读性；不等于原神风格、正式美术或量产验收。不能用 SVG 路径数冒充运行时图元成本。
