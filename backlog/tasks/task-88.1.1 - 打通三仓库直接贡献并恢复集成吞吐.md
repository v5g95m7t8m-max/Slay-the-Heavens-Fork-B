---
id: TASK-88.1.1
title: 打通三仓库直接贡献并恢复集成吞吐
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-16T15:08:00Z'
updated_date: '2026-11-23 05:13'
labels: []
dependencies: []
parent_task_id: TASK-88.1
priority: medium
ordinal: 183000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
接续707/677/708，修复CI与Fork直接贡献。保留Release范围、master保护和正式发布权限。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 真实CI和PR及分支现场有实际处理及可追溯结果
- [ ] #2 Fork来源ID、精确SHA、真实CI、独审和原生队列不降级
- [ ] #3 共用CI与三仓库规范落地，真实链路验证或记录具体外部阻塞
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.保存实时CI与全部PR/分支现场，接续707/677/708。2.修复最小Fork可信准入和共用CI，补负控与独审。3.逐项收口成熟PR及可恢复分支，用真实Fork PR验证或记录外部阻塞。

2026-11-17接续：固定三仓库ID并配置remote；恢复Fork A原生Actions和精确SHA验证；Fork B权限不足单独记录；最小云端规则与现场证据经评审交付，不代替主仓库集成和RC实机。

2026-11-17增量：接续PR712；Quick dispatch完整受影响JS/Lua，未知输入拒绝；Quality PR矩阵前只读核验固定Fork ID、精确HEAD/BASE及先完成的成功run，Full按未知影响升级；保留原生队列/Release策略；定向负控、独审和按需统计。

Owner本轮要求轻量优先：统计复用ci-run-costs，回归并入既有测试文件，撤掉新增测试库存逆投影和重复预算测试；准入仅核验最新同HEAD/BASE已成功的Fork预检，接受原生成功rerun，不要求新提交或额外attempt时间收据。保留全部原生保护和既有历史断言。衡量真实故障收益与CI/维护成本后再加防护。

2026-11-22：按 Owner 最新分流要求，将 Fork-First 接入现有切片认领检查；沿用既有三仓库、定向预检和主仓原生 Review/Required Checks/Merge Queue。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-17：三remote已配置；Fork A通过官方PUT Actions permissions激活4现有工作流，Fast dispatch44007967971真实成功但零测试且明确要求Full，不作回归通过。互援Full44008162718实际启动并定位Windows证据日志尾空格阻塞，正无损压缩修复677/707。Fork B授权后push=true，Actions设置仍403、工作流未登记，已请Owner激活。协作规则独审通过并提交e215a71b，PR712。两条已删除queue ref的旧Full43927295813/43905690493已实际cancelled读回。698实际合入release b9bca884，既有本地不同提交保留。

Owner已授权Fork B写入并启用四现有Actions，三remote可用。两Fork改名后按原固定ID解析并同步A Slay-the-Heavens-Fork-A、B Slay-the-Heavens-Fork-B。A真实输入修复Fast44008650092实际选测成功，B唯一Full44009128502已创建；均不代替主仓库集成。PR712最新80c8887d已再次独审PASS并推送；merge:auto因impact尚未实际给出路由而HOLD，未添加ci:full强行绕过，未声称授权。

云端交接要求：PR712在现有TASK_EXECUTION增加从云端克隆到任务认领、三remote、Fast/Full、独审、正式集成与本地验收的顺序入口；必要现场证据使用远端run/PR与仓库附件，不依赖F盘或本轮聊天。Fork实际名称按固定ID解析，旧名称仍留历史证据。

当前交接：Fork A真实Fast44008650092已完成实际选测；Fork B Full44009128502按准确677新HEAD执行，正式集成未完成。707已正常接续最新Release b9，经来源适配46/46及独立Node24负控、主控独审后FF至e2feae68，原生SQUASH auto已读回；Release四项Required/Strict不变。677与712原merge:auto仅dry-run，当前impact路由未知故HOLD；未加ci:full或绕门槛。任务仅AC1有本轮实际处理证据，其他AC继续未完成。

2026-11-17增量：固定ID/HEAD/BASE/成功且先完成的Fork run准入已实现于Quality/Licenses入口；Quick完整受影响JS/Lua并补语法、Backlog、Lua棘轮，未知/零覆盖拒绝；不触碰保护和677/707策略。actionlint及定向负控通过，独审已消除Full base遗漏、Draft许可证抢跑与rerun时间身份问题。部署与真实跨仓库Actions token正链路仍待托管事件，不提前勾AC。

Owner轻量要求已实施：复用ci-run-costs及现有Quick/cost测试，撤销两项新增测试库存映射与重复预算测试，库存恢复原876。成功rerun直接有效，不再强制新commit/首attempt/时间证明；原生保护不变。旧b480 ForkFull失败已实读：388.17 runner-min、1808s，已定位验证层兼容/CRLF失败；定向98/98、来源85/85及独审PASS。固定基线资料保留b480历史引用，当前树不重复维护；未声称新Hosted Full通过或合入。

2026-11-17统一收口：已逐页核37个开放PR及三仓现有运行/准备分支。A Full44032429395的Windows18片成功但POSIX因skipped admission依赖未展开；在8c664瘦身基础仅复用4629必要内联准入及显式impact成功条件，保留原17条历史before、876库存与成功rerun。B44034686329 annotation明确由FurinyaDev人工取消，16作业获runner/105.53 runner-min，不再按旧403停工；无后续run。回归先红4再绿4，Quick/Full/summary既有三文件62/62。共享文件由现有PR线单写，原执行者/独审继续，实际合并及官方设备AC仍未完成。

2026-11-17运行接续：Owner手动触发B Full44050580539，实读HEAD2089991e/BASEc240/attempt1，POSIX已真正展开；发现POSIX4/11仅两条旧current工作流regex未接显式成功/取消条件，定向2红转2绿，五文件114/114与原来源4/4通过，未回退运行时修复或放宽门禁。B安装现已新增182868876/Actions write，Agent成功自动触发703准确698候选Full44052937001，今后不逐次人工触发。主仓statuses仍read，677原握手POST403且未写pending/auto，权限阻塞单列，未改保护/伪造状态。

Owner本轮明确CI疏通：主仓全部在途运行分页核实，已保存并取消4条无队列引用/确定失败旧候选运行（主仓44021706926/44025702622、Fork A44055271729、Fork B44055273547），均已实际cancelled读回。707最小二进制reader修复独审后仅派发Fork A准确558832b6/BASEb9新候选Full44058918461。712独审额外复现push收据PREFLIGHT_BASE_SHA空值吞掉event.before；现限定dispatch来源并新增真实CLI五事件/环境优先级回归，原before档案保持。当前主仓GitHub安装178440181为statuses=read且未含Administration读取，现有merge:auto安全拒绝；需补Commit statuses:write及Administration:read，未绕过。实际合并闭环仍待。

2026-11-17本轮实际推进：703已原生自动合并00ab3fe6，707经Fork A Full44076227211和主仓Quality44086075879实际合为af77fb24，源分支均删除；709完整覆盖后关闭并清理。核实清理主仓17条、Fork A两条，共19条远端ref；两条Fork707来源作为现有归档9edf8592的父提交远端保留。全51页5062条Actions、32个开放PR已刷新；701真实checks_timed_out且最长job等待6760秒，失效后三旧组仍占15jobs，已留证并取消，非403/代码fail。旧merge:auto权限阻塞不再通过追加连接器Admin/status写权限解决，Owner拒绝三项额外审批配置后改用真实云端独审+同账号COMMENTED+既有Actions证明+原生队列。真实不同BASE收据又暴露重复基线P1，193未推广且取消过期Full；新组消费及事件驱动清尾正在独审，不能宣称闭环已完成。710最小CI修复3ad独审通过，Fork A Full44113901367在运行；同独立Fork B工作不互相阻塞。保留In Progress/未验AC，不伪报Done。实际合并和最终证据以 https://github.com/FurinyaWorks/Slay-the-Heavens/pull/712 及 https://github.com/FurinyaWorks/Slay-the-Heavens/pull/710 为准；已有归档 https://github.com/FurinyaWorks/Slay-the-Heavens/commit/9edf859232f70aa057e440d2eccbc22f8ede2851 。

2026-11-22 Fork-First：开发分支 FurinyaDev/Slay-the-Heavens-Fork-A:chore/fork-first-development 已读回源码 ed71a2c6ca708e5ffe21193030a8bc7d582251e7，基线 ae94d8079df3263c88281e04c9eb05847cf65066；Fork B 也已同步该来源作为 Full 候选。最终验证和实际同步的 HEAD/BASE 记在正式 PR。原有待验项保留。

2026-11-23 PR915收口：原HEAD435999b0/BASE73c21489，正式Full45115055756已自动触发，不再dispatch Fork。真实独审发现非目标ci/full push汇总仍占runner及Quick push收据BASE错误，最小修复进行中。历史回放依赖PR912先落地，保持Required Checks/Queue和原预算门槛；尚未合并，不标Done。
<!-- SECTION:NOTES:END -->
