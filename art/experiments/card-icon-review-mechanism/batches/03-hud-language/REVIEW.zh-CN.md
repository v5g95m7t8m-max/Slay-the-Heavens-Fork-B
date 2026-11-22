# 同一套语言，不是同一个图形｜三张旧稿修订

这是一轮离线试做，用户尚未验收。没有拟合、原生导入或运行时修改，也不直接扩成 75 张。本目录只放原创 SVG/PNG、来源链接与评审；不公开上传原神图片或混合对照图。

## 先看实际图形

- [原神手机端战斗截图（社区加注）](https://github.com/Genshin-Weeb/Intro-to-Genshin/blob/main/assets/attack_graphic.png)，Git blob `b1753ee804bb6ec0024970348cfffa8c2410ea16`。普通攻击、跳跃、冲刺在同一画面里使用不同的语义轮廓和共同的按钮层。不是官方截图发布页，不据它推导所有状态规则。
- [安柏瞄准教学图（游戏原始纹理镜像）](https://github.com/aqkj/gendjs/blob/fee4e82d54e51570d35977b5a0495161aacc1a41/Texture2D/UI/AmberTutorial01/UI_AmberTutorial01_01.png)：白色瞄准符号、安静的底圈、亮蓝强调可分开。仅教学帧，不是 E/Q 冷却录屏。
- [地图按钮](https://github.com/shigatu/Escartem-TGSRedStone-GenshinTextures/blob/fee4e82d54e51570d35977b5a0495161aacc1a41/Texture2D/UI/BtnIcon/Map/UI_BtnIcon_Map.png)先读出折页，路径是次要线索；[队伍按钮](https://github.com/shigatu/Escartem-TGSRedStone-GenshinTextures/blob/fee4e82d54e51570d35977b5a0495161aacc1a41/Texture2D/UI/BtnIcon/Team/UI_BtnIcon_Team.png)用明暗叠压区分两个人，不靠画脸。
- [活动防御状态](https://github.com/PathOfGenshin/resources/blob/015a2493b5672b28576ab78ffbcffde2ea0c9844/resources/gi/Sprite/UI_Activity_CrystalLink_Buff_Defense.png)是盾面中心留空的标记，不代表通用战斗状态 HUD。跟[护心铠](https://github.com/CMHopeSunshine/GenshinWikiMap/blob/7fafe2e18011008d47e347f0f68216d05da0c1f1/resources/talent/Skill_S_Noel_01.png)一比，同一个大类能做成不同形状，不要把所有盾画成一个套环徽章。
- 技能动作参照用[岩主普攻](https://github.com/CMHopeSunshine/GenshinWikiMap/blob/7fafe2e18011008d47e347f0f68216d05da0c1f1/resources/talent/Skill_A_01.png)的宽刃和叠压、[刻晴爆发](https://github.com/CMHopeSunshine/GenshinWikiMap/blob/7fafe2e18011008d47e347f0f68216d05da0c1f1/resources/talent/Skill_E_Keqing_01.png)的宽窄节奏、[岩主星陨剑](https://github.com/CMHopeSunshine/GenshinWikiMap/blob/7fafe2e18011008d47e347f0f68216d05da0c1f1/resources/talent/Skill_S_PlayerRock_01.png)的完整岩体与不等量切面。参照图不是可发行素材。

## 实际区别

先做一眼看懂的轮廓，再决定留白、叠压或第二亮度能否帮助说明角色。区分操作图、技能和状态各在解释什么，卡框/底色不进入图标。对称、弧、箭头、人形都不是禁用项；若它们没说清意思，就不加。牌文负责数值和细则。

同一 144×64 用同一底色和图标缩放。两位非作者独立观察后再揭晓。

| 牌 | 旧首读 | 修订结果 / 限制 |
|---|---|---|
| 普通攻击 | 一把静止的剑 | 两人均读一剑挥出；仍有少量剑加新月联想。 |
| 防御 | 层层套环的盾形徽章，闪点不说明动作 | 两人均读一面挡护盾。没有证明为正在受击，牌效也不要求这样表达。 |
| 星陨剑 | 斩线与碎片，没读出落地 | R1 虽有地面，仍可读向上冒出；R2 加上左上细尾与较重下方岩体，两人盲读为斜落砸地。少量火球联想保留。 |

下批先拿优先方向与已知近邻做不看词的辨认；视觉通过后才测最低能保留动作的原生图元档，不先卡数字。
