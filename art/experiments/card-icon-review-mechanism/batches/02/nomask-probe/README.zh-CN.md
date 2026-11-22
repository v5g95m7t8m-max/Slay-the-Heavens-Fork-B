# 离线试验：普通攻击 32、破防斩 31，不用半图填充

沿用第 2 批精确已审透明源图和最低可读已测档，不换画、不重新拟合。唯一变动：把各 2／3 个原来需要两张半三角的多边形，沿最长边的高分别拆成两张**完整**的千星三角图片 `100003`。其他图元、颜色、透明度和画序不变。输出仍是普通攻击 32 张、破防斩 31 张；两个计数均不包含容器、卡底框或特效。

| 144×64 离线指标 | 普通攻击 | 破防斩 |
|---|---:|---:|
| 半图填充控件 | 0 | 0 |
| 有 X／Y 旋转的控件 | 31 | 31 |
| 原精度轮廓 IoU | 1.0000 | 1.0000 |
| 原精度 RGB 平均误差（0–255；酒红底） | 0.025 | 0 |
| 0.05 px / 0.1° XYZ 网格后的轮廓 IoU | 0.9916 | 0.9940 |
| 同上 RGB 平均误差 | 0.154 | 0.133 |
| 同上 RGB 平均通道差 >24 的像素数（共 9,216） | 2 | 11 |
| 网格化后三角顶点最大误差（px） | 0.043 | 0.051 |
| 原精度／网格化后，超出窗口的不透明几何 | 0 | 0 |

[1× 对比](comparison-1x.png) · [校验记录](receipt.json) · [普通攻击图元](strike-geometry.json) · [破防斩图元](bash-geometry.json)。对比只含原有原创插画生成的几何，不附入任何外部游戏图像。IoU 的二值阈值是 alpha >127；RGB 误差在相同预览底色计算。

## 重跑

依赖 Python 3.12、NumPy 2.3.5、Shapely 2.2.0、Pillow 13.0.0。原始输入路径相对于 checkpoint 的 `batches/`：`01/{strike,bash}.png` 与 `02/fits/{strike,bash}/32.json`（`32` 是预算档，破防斩实际是 31）。代码复用主仓固定提交 [013bdff](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/013bdffb7d4767075d7ebcf0be9eacd275bfbe89) 的 `scripts/art/native-triangle-placement.py`；求解器、输入 PNG、输入几何和输出几何都核验 SHA-256。

```sh
python -B probe.py --repo /path/to/pinned-main-repo --batches /path/to/checkpoint/batches --out /tmp/card-nomask-repro
python -B test_probe.py --repo /path/to/pinned-main-repo --batches /path/to/checkpoint/batches
```

## 适用边界

这是**对拟合结果的预转换**，不是把 X／Y 旋转烘成 Z-only：完整三角以中心锚点／枢轴、单位缩放，按离线 `Ry·Rx·Rz` 投影，使用 `100003` 的可见三角边界；酒红及灰蓝都只做预览。现有仅存 Z 的 packed 表达无法无损接收，需保留 XYZ（独立试验已有 `axes3-decideg-hex30` 原型）。这两张无需半图填充或额外窗口裁剪，结论不泛化到其它卡；窗口检查针对建模的不透明图元，而非旋转后含透明区的外接矩形。此试验未改运行时和正式布局，未执行客户端、官方导入、实机、性能或实际 atlas 透明边缘检查。平台轴序、透明缝及父层画序还需同一候选验证。
