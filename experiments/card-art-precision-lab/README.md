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


## 共享预制组与真实卡面回放

用同一个干净基底运行 `build.mjs`，在预算后加 `packed75`。该候选把 75 份稳定卡号的绘图数据装入同一 Lua 模块，复用 60／10／1 三套模板。模式 `3` 开启，默认为 `0`。前十份与早期压力探针同源。模板仍为本轮加载用的仪器纹样。

```sh
node experiments/card-art-precision-lab/build.mjs build/precision-base/*/candidate.json build/packed160 160 packed75
node experiments/card-art-precision-lab/project.mjs build/packed160/candidate.json build/packed160-projection
node experiments/card-art-precision-lab/replay.mjs build/packed160-projection/adapter-receipt.json   "/path/to/beyond-simulator-mcp/dist/worker.js" build/packed160-replay 3 distinct
```

同一投影用模式 `0` 对照。最后一项接受 `distinct` 或 `repeat`；`PRECISION_REPLAY_PNG=1` 额外用 0.5.2 的软件渲染器导出十卡截图。回放写入新的输出目录，通过 SDK mount 注入唯一的实验参数，SHA 校验 GIL 和投影且不改其中的 Lua。fixture 只指定种子、手牌、敌人和商店样本，照常走生产 Combat、CardDisplay、DeckUI 和节点视图。测量是 SDK 步进与模型开销。截图在计时外生成，图库缺失会列为警告。
