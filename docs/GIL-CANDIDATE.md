# 完整有声 GIL 按需构建

主仓 `develop` 更新后自动运行 **GIL build**，也可在 Actions 手动运行。它在 Windows Hosted Runner 生成完整有声 GIL 并执行独立读回，不需要上传底图、配置保护环境或等待其他 CI。Fork B 的 `ci/full/gil-build/` 分支使用相同入口做验证。验证清单标明归档未批准，冻结源码 CI 证据留空。

完成冻结验收后，从主仓 **Actions → GIL candidate → Run workflow** 执行经批准的构建与归档。工作流运行分支始终选受保护的 `develop`。在 `source_ref` 中填 `develop`、`release/vX.Y.Z` 或 `hotfix/vX.Y.Z`，在 `source_sha` 中填通过验收的完整小写源码 SHA。

- `develop` 接受已合入且对应 Quality 和 Licenses push 均成功的提交，构建开发候选。
- `release/vX.Y.Z` 与 `hotfix/vX.Y.Z` 接受冻结的当前分支 HEAD。先运行 `node scripts/release-ci.mjs freeze <分支> <HEAD>`，等待对应的 Hosted Quality Full 成功。用现有 **Licenses** 工作流在同一冻结分支手动运行默认审计并确认精确 HEAD、`inventory` 成功。工作流复核 Full 的实际 checkout 回执并在归档前重新读取冻结分支 HEAD。分支、源码版号、发布说明与批准记录均须对应本次工程版本。

默认构建从[本项目已发布的 v2.1.1 GIL](https://github.com/FurinyaWorks/Slay-the-Heavens/releases/tag/v2.1.1) 自动取回运行时起点。工作流核对 Release 与固定的 Git LFS 归档、实际构建提交、包大小和 SHA-256。使用当前源码重建 Lua、原生 UI 和结算/BGM 图并独立审计。其余容器段保留旧包的原始字节，证据清单记录继承源与重建的段。默认构建使用 `offline-candidate` 选择构建期文案，用完整的精绘和原生音频预设编译，只上传 `gil-build-evidence-*` 的摘要清单。仓库公开，完整 GIL 归档需要分发批准。

**GIL candidate** 归档使用批准的作品键，把同次构建产物上传到 **Artifacts**，再从 GitHub 下载并复算 GIL、回执与清单的 SHA-256。若已有同一请求且在保留期内的成功制品，运行摘要给出原下载入口。冻结候选的 Artifact 名含工程版本和完整源码 SHA。解压后运行 `sha256sum -c SHA256SUMS` 或使用 PowerShell `Get-FileHash candidate.gil -Algorithm SHA256`。Artifact 保留 14 天。

## 公开归档配置

维护者在主仓 **Settings → Environments** 配置 `gil-candidate`，将部署分支限制为受保护的 `develop`。冻结分支源码由控制步骤按精确 SHA 检出。默认构建在审批环境之外运行。

- 使用默认公开归档时不配置 `GIL_BASE_URL`，批准记录中的底图 SHA-256 填 `afe80c0783d0d4b6046c1f44cba3ef2b71cb8bb34fbc7404d939d12e0f5ff831`。既有的自定义底图流程仍支持通过环境 Secret `GIL_BASE_URL` 下载经批准、去除个人及测试数据的 Production 底图。
- 环境变量 `GIL_CANDIDATE_APPROVAL` 记录本次批准的分支、源码、底图原始字节 SHA-256、实际生产作品键、底图云端处理及最终包公开分发许可。由维护者审查底图、平台资源和音频授权后填写真值。每次换分支、源码或底图都更新批准记录。`reference` 填可追溯的审批编号。项目授权范围见 [LICENSE-SCOPE.md](../LICENSE-SCOPE.md)。

```json
{
  "sourceBranch": "develop",
  "version": null,
  "sourceSha": "<40 位经过 CI 验证的提交>",
  "baseSha256": "<64 位基础 GIL SHA-256>",
  "workKey": "<经核实的实际生产作品键>",
  "baseProcessingApproved": true,
  "publicArtifactApproved": true,
  "reference": "approval/123"
}
```

冻结候选的批准记录改用对应 `release/vX.Y.Z` 或 `hotfix/vX.Y.Z`、工程版本及冻结 HEAD。

Windows Job 使用 Node 24.18.0、锁定的 MCP 提交和 v3 生产预设。冻结候选调用 `npm run build:native -- <base.gil> build/hosted-gil --release-candidate --work-key=<作品键>`，复核源码、BGM 图和信号读回、产物大小及 SHA-256，再对下载版 GIL 独立审计脚本、原生 UI、模板与节点图。制品包含最终音频 GIL、可移植回执、清单和校验和。

保留 `candidate.json` 和 `candidate.gil` 在同一解压目录。使用精确源码、已水合的审核素材和清单指定的 MCP 提交，从项目根目录执行 `npm run verify:platform-load -- <解压目录>/candidate.json <official-load.json>`。将 `MILIASTRA_MCP_ROOT` 指向本机 MCP 检出。原生复审可运行 `node scripts/audit-native-candidate.mjs --source <SHA> --candidate <解压目录>/candidate.gil --receipt <解压目录>/candidate.json --output <新证据目录> --bgm`。

清单将平台版本记为 `null`，由 Owner 实机验收及人工发布后依据平台回执确认映射。官方导入、平台负载、ready、PC 和手机验收使用同一候选，见 [v2 交接](versions/V2-RELEASE-HANDOFF.md)。
