---
doc_type: feature-acceptance
feature: 2026-07-06-background-manual-refresh
status: passed
accepted: 2026-07-06
round: 1
---

# background-manual-refresh 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-07-06
> 关联方案 doc：`/Users/caibitv/WorkSpace/Github/mue/.codestable/features/2026-07-06-background-manual-refresh/background-manual-refresh-design.md`

## 1. 接口契约核对

对照方案第 2.1 节名词层逐一核查：

**接口示例逐项核对**：
- [x] 示例 A（`src/App.jsx` + `Background` / `BackgroundRefresh`）：`App` 持有 `manualBackgroundRefreshToken`、`manualBackgroundRefreshState`，分别传给 `Background` 和右下角风车组件，代码行为一致。
- [x] 示例 B（`src/features/background/api/backgroundCache.js`）：`readReusableBackground()` / `invalidateBackgroundCache()` 已存在，且被 loader、设置入口、sync、marketplace 复用，代码行为一致。

**名词层"现状 → 变化"逐项核对**：
- [x] 背景缓存快照：`currentBackground` 已从只写不读升级为启动优先复用。
- [x] 背景专用刷新按钮：已实现为页面右下角悬浮风车，不读不写 `refreshOption`。
- [x] 手动背景刷新控制面：`App`、`Background`、`useBackgroundLoader` 之间的 token/state 控制面已落地，并增加了 `settling` 渲染完成收尾状态。
- [x] 背景类型矩阵：`api/custom/random_*` 走固定直到手动刷新，`photo_pack` 保留旧时间语义，`colour` / `favourite` / `welcome` 不显示风车。

**流程图核对**（第 2.2 节开头 mermaid 图）：
- [x] 图中“App 递增 token -> Background 看到 token 变化 -> 清空 currentBackground -> 走现有来源链路”的控制流在代码里都有实际落点。
- [x] 旧通用刷新按钮已经脱离背景刷新语义，代码与更新后的设计一致。

## 2. 行为与决策核对

对照方案第 1 节 + 第 2.2 节：

**需求摘要逐项验证**：
- [x] 随机背景类来源在重开标签页时优先复用当前背景：由缓存 helper + `background-cache.test.mjs` 佐证。
- [x] 点击右下角风车只刷新背景：浏览器证据显示点击后 URL 不变，旧刷新按钮仍存在。
- [x] 原有通用刷新按钮不再承担背景刷新：`Refresh.jsx` 只保留 `page/quote` 行为，`NavbarOptions.jsx` 下拉项同步只保留 `page/quote`。

**明确不做逐项核对**（用第 3 节反向核对项）：
- [x] 范围外事项“背景图库列表页”确实没做。
- [x] 没有把 `currentBackground` 或 `imageQueue` 移出 sync exclusion。

**关键决策落地**：
- [x] 风车按钮从右上角工具组改为页面右下角悬浮控件，和最终实现一致。
- [x] 旧刷新按钮不再承担背景刷新语义，和最终实现一致。
- [x] 风车停止时机绑定到真实渲染完成，且有丝滑缓停，这一点实现已超过初稿设计，需要视为“方案回填后通过”。

**编排层"现状 → 变化"逐项核对**：
- [x] 启动路径先判定是否复用缓存，再决定是否走随机抽取。
- [x] 手动刷新通过 `App` 内 token 驱动，不走 `backgroundrefresh`。
- [x] settings / exclude / marketplace / sync 均统一接到缓存失效 helper。

**流程级约束核对**：
- [x] `invalidateBackgroundCache()` 先于新的随机背景选择发生。
- [x] 背景相关 sync key 落地时先失效缓存，再触发 refresh/remount。
- [x] 手动刷新失败或无数据时会回到 `idle`，不会把风车卡死。
- [x] 风车在背景真正渲染完成后再进入 `settling` 收尾，而不是按固定最短时长结束。

**挂载点反向核对（可卸载性）**：
- [x] `App` 顶层状态：新增 `manualBackgroundRefreshToken/state` 控制面。
- [x] 页面右下角新增悬浮风车按钮挂载点：`App.jsx` 直接挂 `BackgroundRefresh`。
- [x] 旧 navbar 刷新按钮移除背景刷新语义：`Refresh.jsx` 与 `NavbarOptions.jsx` 已同步收口。
- [x] 背景启动加载入口新增缓存复用判定：`backgroundLoader.js` 已落地。
- [x] 背景来源配置变更入口统一接入失效 helper：grep 结果都落在清单内。
- [x] 反向 grep 未发现清单外的额外挂载残留。

## 3. 验收场景核对

本次按 **accept-inline verification** 执行，没有额外生成 QA 报告。

### Inline Verification Matrix

| ID | 场景 | 来源 | 核心性 | 命令或动作 | 结果 |
|---|---|---|---|---|---|
| AVM-001 | 缓存复用/失效纯逻辑 | 自动化 | core | `bun test tests/background-cache.test.mjs` | pass |
| AVM-002 | sync 相关刷新与 remount 基线 | 自动化 | core | `bun run test:sync` | pass |
| AVM-003 | 构建完整性 | 自动化 | core | `bun run build` | pass |
| AVM-004 | 右下角风车存在且旧刷新按钮仍在 | 浏览器运行证据 | core | 打开 `http://127.0.0.1:5173/?nointro=true`，读取 visible DOM | pass |
| AVM-005 | 点击风车不触发 reload | 浏览器运行证据 | core | 点击 `Refresh background`，前后 URL 都是 `http://127.0.0.1:5173/?nointro=true` | pass |
| AVM-006 | 用户终审 | 手工验证 | core | 用户明确说明“目前测试下来已经没有问题了，效果还是可以的” | pass |
| AVM-007 | 本 feature 定点 lint | 静态验证 | supporting | 定点 `eslint` 通过，仅有 `baseline-browser-mapping` 提示 | pass |

- [x] **S1 启动复用**：由 `AVM-001` 覆盖，且用户实测未报告打开标签页仍随机换图。
- [x] **S2 photo_pack 保持旧时间语义**：代码保留旧分支并补了 `backgroundStartTime` 刷新；本轮按 `trust-prior-verify` 计入，用户未报告异常。
- [x] **S3 favourite / welcome 覆盖时隐藏风车**：显示条件已编码，且浏览器证据中仅在普通背景态看到风车；按 `trust-prior-verify` 通过。
- [x] **S4 风车只刷新背景**：由 `AVM-004/005/006` 覆盖。
- [x] **S5 旧刷新按钮兼容**：由代码核对 + 设计收口覆盖，当前只保留 `page/quote` 两种模式；按 `trust-prior-verify` 通过。
- [x] **S6 源配置变更后缓存失效**：由 `AVM-001/002` + grep 证明。
- [x] **S7 失败回退**：review-fix 已直接修复“无数据返回 null 时卡 loading”的问题。
- [x] **S8 纯逻辑判定**：由 `AVM-001` 覆盖。

**功能性前端改动浏览器验证**：
- [x] 右下角存在 `Refresh background`
- [x] 右上角旧 `Refresh` 按钮仍存在
- [x] 点击风车不会触发页面 reload

**review 报告重点复核**：
- [x] `background-manual-refresh-review.md` 第 5 节 Test And QA Focus 已覆盖。
- [x] review residual risk 已转化为 acceptance 里的浏览器复核和最终审计说明。

**QA 报告重点复核**：
- [x] 验证证据来源：accept-inline verification
- [x] Inline Verification Matrix 已覆盖 design 关键场景与 review QA focus
- [x] failed / blocked 项为 none
- [x] residual-risk 未承载核心验收缺口

## 4. 术语一致性

- [x] `currentBackground`、`invalidateBackgroundCache`、`BackgroundRefresh`、`manualBackgroundRefreshState`、`settling` 在代码中命名一致。
- [x] 防冲突 grep 未发现新的公共领域术语冲突。
- [x] 设计文档已回填为“右下角悬浮风车 / 旧刷新按钮仅 page/quote”，与实现一致。

## 5. 领域影响盘点（提示而非代写）

- [x] 新名词：无需要进入 `requirements/CONTEXT.md` 的长期领域术语。当前新增概念都是前端实现层局部概念。
- [x] 结构性选择：无需要单独记 ADR 的系统级决策。
- [x] 流程级约束：有 1 条值得后续沉淀到 compound 的约束：
  - 背景来源变更必须统一走缓存失效 helper
  - 结论：建议走 `cs-keep`，不需要 `cs-domain`

## 6. requirement delta / clarification 回写

- [x] 无 requirement 影响
- 理由：本次是现有背景/刷新能力的交互与性能收敛，不新增独立用户可感 capability 边界；frontmatter `requirement` 为空，按 skip 处理。

## 7. roadmap 回写

- [x] 非 roadmap 起头
- `roadmap / roadmap_item` 均为空，跳过。

## 8. attention.md 候选盘点

- [x] 本 feature 未暴露必须追加到 `attention.md` 的硬性项目。
- 可选候选：
  - 若后续频繁做前端验收，可把“本地浏览器验收默认加 `?nointro=true` 跳过欢迎页”视为调试技巧，但目前不建议写进 attention。

## 9. 遗留

- 后续优化点：
  - 可为 `manualBackgroundRefreshState` 补更细的状态自动化测试
  - 仓库级 `EventBus` 历史清理问题后续可单独治理
- 已知限制：
  - `photo_pack` 时间语义、`favourite/welcome` 隐藏风车、旧刷新按钮 `page/quote` 两模式，本轮主要依赖代码核对 + 用户实测反馈，没有完整自动化
- 实现阶段顺手发现：
  - none

## 10. 最终审计

- 验证证据来源：accept-inline verification
- Evidence sources：none
- Inline Verification Matrix：见第 3 节
- 聚合命令：
  - `bun test tests/background-cache.test.mjs` → 通过
  - `bun run test:sync` → 通过
  - `bun run build` → 通过
  - 定点 `eslint`（实现阶段证据）→ 通过，仅 `baseline-browser-mapping` 提示
- 场景复核：
  - re-verified：5
  - trust-prior-verify：3
  - trust-prior 比例 37.5%，需要以用户终审肉眼确认兜底；当前用户已明确确认效果可接受
- 交付物复核：
  - 代码：通过
  - 配置 / i18n：通过
  - 设计 / review / acceptance / checklist：通过
  - architecture / requirement / roadmap：均按 skip/none 处理，无缺口
- 完整工作区复核：
  - `git status` 中所有本 feature 相关改动均可归因；`.gitignore` 为既有 baseline dirty file，不纳入本 feature 验收结论
- diff 清洁度：
  - 未发现新增 debug 输出、TODO/FIXME、注释掉代码、无用 import
- 知识沉淀出口：
  - compound 候选 1 条：背景来源变更统一失效 helper
  - attention 候选：无硬性项
- 结论：通过
