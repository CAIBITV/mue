---
doc_type: feature-design-review
feature: 2026-07-06-background-manual-refresh
status: passed
reviewed: 2026-07-06
round: 2
---

# background-manual-refresh feature design 审查报告

## 1. Scope And Inputs

- Design: `/Users/caibitv/WorkSpace/Github/mue/.codestable/features/2026-07-06-background-manual-refresh/background-manual-refresh-design.md`
- Checklist: `/Users/caibitv/WorkSpace/Github/mue/.codestable/features/2026-07-06-background-manual-refresh/background-manual-refresh-checklist.yaml`
- Intent / brainstorm: none
- Roadmap: none
- Related docs:
  - `/Users/caibitv/WorkSpace/Github/mue/.codestable/attention.md`
  - `/Users/caibitv/WorkSpace/Github/mue/.codestable/requirements/CONTEXT.md`
  - `/Users/caibitv/WorkSpace/Github/mue/.codestable/requirements/adrs/001-own-the-fork-and-promote-main.md`
- Code facts checked:
  - `/Users/caibitv/WorkSpace/Github/mue/src/App.jsx`
  - `/Users/caibitv/WorkSpace/Github/mue/src/features/background/hooks/useBackgroundLoader.js`
  - `/Users/caibitv/WorkSpace/Github/mue/src/features/background/hooks/useBackgroundEvents.js`
  - `/Users/caibitv/WorkSpace/Github/mue/src/features/background/api/backgroundLoader.js`
  - `/Users/caibitv/WorkSpace/Github/mue/src/features/navbar/Navbar.jsx`
  - `/Users/caibitv/WorkSpace/Github/mue/src/features/navbar/components/Refresh.jsx`
  - `/Users/caibitv/WorkSpace/Github/mue/src/features/misc/modals/Modals.jsx`
  - `/Users/caibitv/WorkSpace/Github/mue/src/utils/eventbus.js`
  - `/Users/caibitv/WorkSpace/Github/mue/src/utils/sync/configSyncService.js`

### Independent Review

- Status: completed
- Detection: native-agent
- Provider / agent: `multi_agent_v1` reviewer `Hilbert`
- Raw output: reviewer 首轮指出 2 个 blocking、3 个 important；本轮已逐条修订 design/checklist，终轮结论为 `blocking:none`、`important:none`
- Merge policy: 已逐条本地核验 reviewer finding，并将有效问题回写到 design / checklist 后复审通过
- Gate effect: none

## 2. Design Summary

- Goal: 固定随机背景类来源在新标签页重开时的展示结果，直到用户点击专用风车按钮手动刷新；同时保持旧通用刷新按钮兼容
- Key contracts:
  - 名词层：`currentBackground` 升级为可复用缓存快照；新增 `App` 内部手动背景刷新控制面；明确背景类型适用矩阵
  - 编排层：新风车改走 `App -> Background / Modals -> Navbar` 的 props 控制面，绕开新的 EventBus seam；背景设置与 config sync 落地统一先失效缓存、后重挂载/刷新
- Steps: 5 步，风险热点集中在缓存失效时序、旧刷新按钮兼容、`photo_pack` 历史行为保持
- Checks: 16 条，来源覆盖名词契约、流程级约束、挂载点、范围守护、验收场景
- Baseline / validation: `bun test tests/background-cache.test.mjs`、`bun run test:sync`、`bun run lint`、`bun run build`

## 3. Findings

### blocking

- none

### important

- none

### nit

- none

### suggestion

- none

### learning

- 当仓库已有历史 EventBus 且卸载语义不可靠时，新 feature 若只是局部 UI 协调，优先把新控制面放回 React 树内，通常比继续叠加事件协议更稳

### praise

- 设计稿已把“旧按钮兼容”和“新风车单职责”拆成两条明确契约，没有为了减少 UI 重复而偷偷改变现有用户路径

## 4. User Review Focus

- 用户需要重点拍板：
  - 风车按钮继承现有 `refresh` 总开关、但不继承 `refreshOption`，是否符合你的预期
  - `photo_pack` 保留旧 `backgroundchange` 时间语义，而不是一律变成“只手动刷新”，是否符合你的预期
- implement 需要重点遵守：
  - 新风车通路不能再新增 EventBus 订阅 seam
  - `configSyncApplied` 相关背景配置落地必须先失效缓存，再触发刷新或重挂载
  - `favourite / welcome` 覆盖态下风车隐藏
- code review / QA / acceptance 需要重点复核：
  - 旧通用刷新按钮在重挂载后的行为有没有被连带放大
  - `photo_pack` 在未到/已到轮换时点两种场景下是否都保持兼容

## 5. Evidence Confidence Ledger

| Check | Verdict | Evidence Class | Basis | Follow-up |
|---|---|---|---|---|
| Acceptance Coverage Matrix | pass | E | design 第 3 节矩阵已覆盖启动复用、风车刷新、旧按钮兼容、缓存失效、失败回退、`photo_pack` 兼容 | acceptance 按矩阵逐项反查 |
| DoD Contract | pass | E | design 第 3 节 DoD 与 checklist `dod.commands` 对齐 | implement 时保持命令 ID 一致 |
| Steps and checks traceability | pass | E | checklist 的 steps/checks 均可追溯到 design 第 1/2/3 节 | code review 时核对实现证据与 step 对应 |
| Roadmap contract compliance | pass | E | 本 feature 非 roadmap 起头，design frontmatter 已留空 | none |
| Module interface design | pass | C | design 第 2.1 已结合 `App`、`Background`、`Navbar`、`Modals` 真实代码说明 props seam 与缓存 helper 边界 | implement 时避免把业务判断上提到 `App` |
| Validation and artifacts | pass | C | 设计稿已列出验证命令、手工证据、文案和测试交付物 | acceptance 时补足实际证据 |

Summary: E=4, C=2, H=0, H-only core checks=none。

## 6. Residual Risk

- 现有旧 `backgroundrefresh` 链路本身仍依赖仓库里的历史 `EventBus` 机制；本 design 已把新风车 seam 绕开它，但实现/QA 时仍应重点确认旧通用刷新按钮在重挂载后的行为没有被连带放大
- `photo_pack` 的“未到轮换时点复用、到点后继续按旧规则切换”主要靠手工场景证明；acceptance 时建议把这条作为非核心但必看的兼容复核点

## 7. Verdict

- Status: passed
- Next: 交给用户整体 review
