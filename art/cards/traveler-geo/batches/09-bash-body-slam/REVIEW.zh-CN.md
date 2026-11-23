# 岩主卡图小样 · 破防斩与格挡反击

基于 [R4 研究与原样](https://github.com/v5g95m7t8m-max/Slay-the-Heavens-Fork-B/tree/b95e7dcb11b5e03d1f1d8d4088db96ab415318dc/art/cards/traveler-geo/batches/08-glyph-clarity)。R4 结论限于三张小样的尺寸可读性。本轮交付两张原创透明 SVG 和离线预览。

| 小样 | 初代标准卡图实看与转译 |
| --- | --- |
| [破防斩](bash.svg) | 原画是钝重武器斜向砸入硬面，撞点两侧有崩裂。保留单一撞点和硬面开裂，改用岩主的斜向剑锋和一条宽裂口。裂口表现施加易伤，牌面文案仍承担具体效果。 [初代标准牌](https://slayspiredb.com/sts1/cards/bash) · [原画文件](https://slayspiredb.com/art/sts1/cards/red/attack/bash.webp) |
| [格挡反击](body-slam.svg) | 原画以装甲角色整体向前撞击，接触点和后方拖势突出重量。改用完整岩盾作为撞击主体，把厚盾侧面和短拖形接成向右的轮廓。伤害按当前格挡计算，由牌面文案说明。 [初代标准牌](https://slayspiredb.com/sts1/cards/body-slam) · [原画文件](https://slayspiredb.com/art/sts1/cards/red/attack/body_slam.webp) |

实看《原神》移动 HUD 及岩主的星陨剑、岩潮叠嶂图标。借鉴亮色主体与暗面叠压、几块大切面形成岩体、靠外形传达方向。两个 SVG 均重新绘制，参考图只用于查看。 [移动 HUD 社区截图](https://github.com/Genshin-Weeb/Intro-to-Genshin/blob/main/assets/attack_graphic.png) · [星陨剑图标镜像](https://www.genshinlab.com/wp-content/uploads/2021/07/Traveler-Geo_Talent_Starfell_Sword.png) · [岩潮叠嶂图标镜像](https://www.genshinlab.com/wp-content/uploads/2021/07/Traveler-Geo_Talent_Wake_of_Earth.png)

## 尺寸验证

[48／32／22 px 对照与卡图裁切](comparison.png) · [破防斩原尺寸裁切](bash-144x64.png) · [格挡反击原尺寸裁切](body-slam-144x64.png)

沿用第 06 批的 52 px 方形图标框，将透明图标等比居中叠到 144×64 px 卡图井，底色取仓库现有攻击色 `#551C24`。源文件均为简单封闭路径。离线检查确认两张裁切尺寸正确，四角保留原底色，两张图在各测试尺寸下的主要不透明区域均为单个连通块（以 alpha ≥ 128 检测）。

一位独立评审只看匿名对照，四行混入 R4 的挥剑与防御，未提供牌名、机制或稿次。

- **48／32 px 与 144×64 裁切**：破防斩读成武器斜击并裂开硬面；格挡反击读成整面盾向右冲，与对照的正面静止盾可区分。
- **22 px**：破防斩仍看得见撞点和锯齿裂口，受击物有时会被看成普通岩块；格挡反击仍看得见完整盾和拖形，后缘的阶梯合成一块，实际撞击靠前压姿态推断。评审认为这两张是四行中动作对比最清楚的一组。

本轮证据覆盖离线静态可读性。图元拟合、游戏内显示、正式美术风格与 75 张扩展仍待验证。
