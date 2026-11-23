# #915 精确 BASE 收据检查

候选 `435999b01f88ca9986783eb2976df55e6e56d313`。本目录只保存独立诊断，不修改上游 PR 或工作流。

- **Fork A 自动 Quick：已复现。** [工作流传入已冻结的 BASE](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/435999b01f88ca9986783eb2976df55e6e56d313/.github/workflows/quick-feedback.yml#L89-L101)，但[收据脚本](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/435999b01f88ca9986783eb2976df55e6e56d313/scripts/write-ci-receipt.mjs#L8-L12)仅在手动触发时读取该参数，push 填入前一次 push 的 SHA。真实 Git 临时仓库、原始收据写入脚本和合成事件正负对照见 `result.json`。PR 和普通 push、手动触发均验证原边界。
- **Fork B 显式 Full：静态发现、未触发托管作业。** [impact 取到上游 BASE](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/435999b01f88ca9986783eb2976df55e6e56d313/.github/workflows/quality.yml#L77-L90)却没有输出给 Windows jobs；[预取与变更检查](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/435999b01f88ca9986783eb2976df55e6e56d313/.github/workflows/quality.yml#L310-L334)、质量棘轮和收据仍读 `event.before` 或手动输入。第一次新分支 push（before 全零）也应覆盖，不能让检出、断言和收据各记一个 BASE。
- 建议在两条已明确选择的 Fork 预检路径上分别把同一经验证的 BASE 从计划贯穿到测试和收据；保留普通分支 push/PR/merge group/手动选择语义及 Required Checks。修好后只用一条代表性 Quick 和下一个确有需要的 Full 验证，不为取证额外派发 Full。

在本候选的精确检出上重现 Fork A 的原始错误：`node docs/evidence/fork-preflight-915-20261123/replay-receipt.mjs`。
