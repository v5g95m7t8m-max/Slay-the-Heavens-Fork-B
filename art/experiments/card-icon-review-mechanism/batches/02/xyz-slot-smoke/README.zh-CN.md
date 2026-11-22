# 普通攻击／破防斩 XYZ 真实卡槽写入离线冒烟

输入为 [Fork B 43620bdd](https://github.com/v5g95m7t8m-max/Slay-the-Heavens-Fork-B/commit/43620bddad1c6b05ac72130186d3f7a7162fe8ce) 的零半图几何（32／31），以及**同提交**的 `CardDisplay` 和 `NativeArtRuntime`。脚本逐文件检查 Git blob，图元另外检查 SHA-256。控件替身复用主仓 [013bdff](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/013bdffb7d4767075d7ebcf0be9eacd275bfbe89) 的现有 Lua 夹具。Fengari 跑实际 `bindNativeAssets → writeNativeArt → Runtime.request → writeNativeSlot`，只用 mock 控件记录 SDK setter；不走会跳过旋转的 `compactRectangles`，也未启动千星客户端。主题只提供模块加载所需的空配置表，读取任何配置值会让测试失败。

验证同一宿主 `Strike 32 → Bash 31 → fallback → Strike 32`，检查手动切换和显式清理后没有旧图元；候选未完整画完不覆盖默认图标；同版本新 UID 不重新创建。逐行核对 atlas、位置、尺寸、XYZ、锚点、枢轴、缩放和 RGBA。另令真实写入路径的 `SetLocalRotation` 返回 false：保持默认图标、不留下局部图元、下一帧不会自动重试；显式清空后可恢复。实际宿主下的活跃对象数（图片／动态容器）是 32／1 与 31／1，宿主自身不计；mock 的一次 update 不是耗时性能结论。

| 从 setter 实际读回坐标进行离线投影 | XYZ | 仅 Z 反事实 |
|---|---:|---:|
| 普通攻击第 12 行，第 1 个顶点 y | 45.6858 | 68.6965 |
| 破防斩第 13 行，第 2 个顶点 x | 82.9447 | 59.6014 |

## 复现

Node 24、主仓锁定的 Fengari、Python 3.12 + NumPy。先准备两处工作目录，主仓缺依赖时在该工作目录运行 `npm ci --ignore-scripts`。命令只写新的输出目录。提交 SHA 与各个运行所用 blob 见 `run.sh`。

```sh
FORK=/path/to/fork-b-at-43620bdd
UPSTREAM=/path/to/slay-the-heavens-at-013bdff
GEOMETRY="$FORK/art/experiments/card-icon-review-mechanism/batches/02/nomask-probe"
bash run.sh "$FORK/src/lua" "$GEOMETRY" "$UPSTREAM" /tmp/strike-bash-slot-smoke
```

可选第 5 个参数接受**历史隔离** `axes3.generated.lua`（Git blob `9852acaa9f538dd33ff2ded0366ea8762e1369ea`，从 [eac8c18a](https://github.com/v5g95m7t8m-max/Slay-the-Heavens-Fork-B/commit/eac8c18afdee5cce859c24e60088b130240154b0) 取证的历史 packed 原型生成，不是 43620bdd 的现行运行时，也不是本包依赖）。该对照只证明其 0.05 px / 0.1° 解码后，从已拍平 atlas 行恢复 XYZ 并正确清理，不能替代真写入路径；容器数与当前字面槽路径不同。无客户端、原生发行、GPU、atlas 边缘或导入结论。
