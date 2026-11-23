# 怪物详情回流补充：Act 2、Boss、Act 4

在 Develop 基线 `73c21489efaab409d4c0c46bee517d410d3427fc` 先应用同分支 `develop-staging/develop-73c-candidate.patch`，再应用本目录 `neighbors.patch`。后者仅改 7 个测试或夹具；未改生产逻辑、药水或外部发布。

- 通过 Act 2 的 14 个行为用例和原始档案 SHA 验证。界面断言验证实际紧凑提示；效果断言继续核验模型，不把未执行的详细预测塞回界面。
- 保留分裂 Boss 真正生成子怪和可选目标的校验。第四幕保留心脏五张状态牌的去向，以及尖塔盾实际结算与显示的数值差异校验，并补齐紧凑提示用例。
- 三个套件合计 5/5，未跑 Full。原基线快照仅缺少 LFS 真实内容，用仓库冻结指纹复原 `tests/fixtures/pr323-historical-fixtures.json.gz`（SHA-256 `0016ea0a00171a413c2697329ea87487c19c575b6148a325285e35a24b4e8759`）后，原封不动的历史断言也通过。
- Artifact 边界及 Develop/Release 药水拖放策略仍未收口；继续 HOLD，不提交 Develop 合并。

命令：构建 `node scripts/build-lua-data.mjs && node scripts/build-ui.mjs && node scripts/map-ui-layout.mjs`，然后 `node --test --test-concurrency=1 tests/act2-intent-ui.test.mjs tests/bosses-intent-ui.test.mjs tests/ending-intent-view.test.mjs`。
