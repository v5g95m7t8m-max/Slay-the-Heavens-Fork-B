## What & why
<!-- One paragraph: the change and the problem it solves. Link the task. -->

## Type of change
- [ ] fix (PATCH)   - [ ] feat (MINOR)   - [ ] breaking (MAJOR)
- [ ] chore / docs / refactor / test / ci (no release)

## Base branch
- [ ] 新Feature → `develop`；不反向引入Release
- [ ] v2.0.0必要修复 → `release/v2.0.0`
- [ ] release/* or hotfix/* → `master` (+ back-merge into `develop`)

## Release scope
<!-- Targeting release/*: fill each declaration exactly once. Rules: .codebuddy/skills/release-maintenance/SKILL.md -->
Change-Type:
Target-Version:
Release-Necessity:
<!-- Types: bugfix, performance, regression, release-engineering. Feature goes to develop; self-declared exceptions are invalid. -->

## PR dependencies
Depends-on: none
<!-- External prerequisites that must merge first: replace none with #123, #456.
Work fully included in a coordinated integration is recorded below, not falsely
claimed to have merged independently. Required by merge:auto. -->

<!-- Coordinated integration only: record source PR/branch, frozen full HEAD SHA,
included scope and conflict-resolution decisions in this PR body. Ordinary PRs
need no extra table. See docs/CI.md: 多 Agent 协调集成. One coordinator owns the
integration branch; pause source PR auto-merge and confirm dequeue before takeover.
Review/test the complete combined candidate; source green checks are not inherited. -->

## Backlog closeout
Backlog: none
<!-- List every changed task: TASK-1=done, TASK-2=verify, TASK-3=continue,
TASK-4=superseded:TASK-3. done requires all AC already evidenced and checked;
verify keeps started work In Progress with open acceptance; superseded preserves history and its successor.
Use recorded for cleanup/status updates already committed; it validates without mutating the task again.
verify:delivery --merged applies this line via CLI after exact merged verification.
Use none only when this PR has no task updates. -->

## Integration slice
<!-- Describe the independently verified behavior, the next dependent slice if any, and the
flag owner/removal condition if applicable. For over-budget production that cannot reasonably be split, use
Slice-exception: atomic | why it must land together | verification command or evidence
Other valid reasons: mechanical, generated, tests. The independent reviewer verifies the reason and evidence. -->

## How to test
1.

## Checklist
- [ ] Production fits 400 added/deleted lines and 10 files, or includes a reviewed exception
- [ ] Tests added/updated and passing locally
- [ ] No secrets/PII in diff
- [ ] Breaking changes documented + migration notes
- [ ] Backlog task status updated
- [ ] One independent slice, or a scoped coordinated integration with frozen sources; external dependencies have landed
- [ ] After merge, compare the exact PR head before deleting its branch/worktree; retain dirty files, independent commits and unique evidence

## Screenshots / logs

<!-- Source/base/head, fresh command results and evidence paths. For candidate/UI
claims: current receipt/run and actual human review scope. For integration:
check + presentation + engineering-posix, actual checkout identity, traceable
independent review (or GitHub-verified --low-risk-docs waiver). Offline PASS does not imply official import or gameplay PASS. -->
