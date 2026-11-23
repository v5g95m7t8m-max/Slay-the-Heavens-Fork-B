# Develop 收敛试验：敌人三处读数一致

状态：**HOLD，证据分支；不准合入。** 基线 `73c21489efaab409d4c0c46bee517d410d3427fc`。行为来源是 Release #925（提交 `2d979ef9c8e2029e0635cc23888580dd941b8609`）以及它已依赖的读数和鼠标交接。这里仅存放补丁与验证，不安装到当前分支的游戏源码中。

- 保留 Develop 的首领宝箱返回提示、打击标签词条、原样药水弹层、结算与功能开关。只把读数选择、与头顶一致的紧凑排版、HP/轮廓输入、必要的状态位置与输入仲裁拼回去。
- 默认离线布局：原基线在第一条 PC 敌人轮廓读数用例缺少 hover 监听；候选在相同定向套件通过 11 个 Lua 行为用例及文本容量检查（2 个 Node 测试通过）。
- 正式资源、精制怪物及原生页面的离线 Host：大颚虫第一招在 PC 和模拟手机各三处均为同一 11 点攻击提示，原旧卡隐藏，实际回合数值和目标不变。更大的官方配置用例通过前 10 项（含长列表、多段、符文圆顶、目标牌和点按药水）；第 11 项仍红。Release #908 的正式资源药水带拖拽会取消，而 Develop 当前规则仍允许拖拽；复刻 #925 的验收不能把两条产品策略当成一致。本候选没有改药水拖拽策略，也没有更改该断言。
- 邻接 Node 回放 8 绿、5 红。存在旧展示契约（Act 2、Boss、Act 4、Artifact 仍读旧的预测详情）及未复原的精确历史压缩夹具。下次逐条用同一基线复核并保留结算和历史快照断言，不能以删断言或只改期望冒充全绿。已从可核验缓存复原 988 个与 LFS 指针 SHA-256 一致的资源，12 个未复原，其中 `tests/helpers/rebased-release-source.json.gz` 影响历史文本检查。没有启动 Full、未运行官方客户端或手机。
- 队列注意：#907 如先进 Develop，重新基于实际提交适配。#909 的 battle UI 音频区不重叠；#912 的官方资源测试存在 `sameColour` 邻接冲突，故未把整个 Release 的官方测试文件复制过来。该组合跨现有普通 PR 尺寸预算，形成主仓分片或证实原子例外后才考虑提 PR。

重现：以精确基线独立工作树执行 `git apply --check develop-73c-candidate.patch`、`git apply develop-73c-candidate.patch`；用仓库 Lua 依赖执行 `node scripts/build-lua-data.mjs && node scripts/build-ui.mjs && node scripts/map-ui-layout.mjs && node --test tests/approved-enemy-details.test.mjs`。官方资源的离线运行复用父级的 `probe.mjs` 官方配置。补丁未包含生成物或任何 LFS 内容。
