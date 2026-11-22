# 卡牌插画精度实验

当前视觉参考和历史设计版本见[版本登记](../../art/cards/traveler-geo/design-revisions.json)。其中六张《杀戮尖塔》原版铁甲战士插画均为 standard art。按登记中的来源提交、路径及 SHA 下载至工作树外私有目录。公开分支仅含元数据、程序和测量。原作图像、旧稿重绘和候选关卡文件均保留在隔离实验环境。

## 复现

从仓库根运行。使用仓库锁定的 Node 依赖、Python Pillow/NumPy，以及仓库已有的千星 MCP 和 BeyondSimulator 0.5.2。以下 GIL 基底是 MCP 提交 `70470757d6fcb319c5afec13b178c87f2d8d54b3` 的干净客户端控件夹具，来自 MCP 的 `tests/fixtures/editor-2026-10-26-shapes.gil`。

```sh
npm ci --ignore-scripts
python3 experiments/card-art-precision-lab/revisions.py
python3 experiments/card-art-precision-lab/revisions.py --private-dir <工作树外的原画目录>
npm run build:data
npm run build:ui
node experiments/card-art-precision-lab/measure.mjs build/precision-measure

export MILIASTRA_MCP_ROOT=<固定版本MCP目录>
export MILIASTRA_ALLOW_LIVE_WRITE=0
node scripts/build-native-candidate.mjs "$MILIASTRA_MCP_ROOT/tests/fixtures/editor-2026-10-26-shapes.gil" build/precision-base \
  --art-cards=false --art-menu-background=false --art-selection-avatar=false \
  --art-battle-portrait=false --art-monsters=false
node experiments/card-art-precision-lab/build.mjs build/precision-base/*/candidate.json build/precision-160 160
node experiments/card-art-precision-lab/project.mjs build/precision-160/candidate.json build/precision-simulator
ART_LAB_MCP_ENTRY=<模拟器dist/index.js> node experiments/card-art-precision-lab/smoke.mjs build/precision-simulator
```

隔离 GIL 使用真实 CardDisplay、动态文字、战斗和页面逻辑。公开整数参数 `precisionLabMode` 默认 `0`，不加载实验绘图模块或创建实验图元。手动改变隔离副本参数为 `1` 可测试共享运行时原有逐个控件创建，为 `2` 可测试每次更新最多实例化一个图元预制组。每张测试图的内容是固定的仪器负载纹样。重复卡使用同一图元定义，已呈现的同一宿主只做可见性协调，每张实体仍有独立原生子树。清理继续走原运行时，拖动只移动卡面父容器。

`fit.py <新输出目录> --id <稳定卡号> --source <已授权的144×64源图> --approved-source-sha256 <源图摘要>` 提供矩形网格、误差驱动矩形及边缘加权混合图元的 60/100/160/250/400 档输出。显式源文件和散列必填。工具拒绝已登记的原作原始字节及旧 Compact 源。按预算保留 MAE、边缘 MAE、PSNR、SSIM、分档像素摘要和目标误差前沿。当前没有批准的生产源图，因此本轮拟合结果未用于质量决策或 GIL。负载探针可独立运行。

导入时只用测试存档，官方窗口操作需该轮授权。官方客户端容量、真实 battle GPU 帧、安卓、触控及重复进出设备验收仍待测。
