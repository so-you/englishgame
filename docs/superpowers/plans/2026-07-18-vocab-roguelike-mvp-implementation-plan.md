# 英语爬塔 MVP v0.1 实现计划与开发任务

日期：2026-07-18

状态：**可执行**

设计依据：[`docs/superpowers/specs/2026-07-18-vocab-roguelike-design.md`](../specs/2026-07-18-vocab-roguelike-design.md)

## 1. 交付目标

交付一个可在 Web 浏览器运行的核心验证版本，完整走通：

```text
选择内容包
  → 调度到期词与新词
  → 战前教学
  → 普通战 1
  → 三选一遗物
  → 普通战 2
  → 回血
  → Boss 战
  → 学习结算
```

MVP 必须验证三个假设：

1. 每场有限专注的过载机制是否形成有趣决策，而不是强制答题税。
2. 勇气奖励和挑战加成能否促使玩家尝试到期或低掌握项目。
3. 完整会话能否产生可靠的 SRS 数据和 24 小时、7 天学习效果信号。

## 2. MVP 边界

### 2.1 必须包含

- Vite + React + TypeScript Web 应用。
- 固定三战流程：2 个普通敌人和 1 个 Boss。
- 12 张固定卡牌躯壳、3 个遗物、专注、过载、语流和勇气奖励。
- 双层卡牌模型：`CardTemplate + LearningUnit → CombatCardInstance`。
- 30 个 CET4 词义学习项目。
- 战前首次教学和局内有支架练习。
- 可防止重复开局刷进度的 SRS 状态机。
- CSV/TSV 自定义词表导入、预览、列映射、去重和错误报告。
- IndexedDB 本地存档、会话恢复、数据导出与重置。
- 键盘操作、减少动画、关闭计时提示和语音不可用时的替代题。
- 本地诊断指标：会话完成、专注使用、到期项目尝试覆盖率等。

### 2.2 明确不做

- 程序生成地图、路线选择、商店、随机事件和完整牌组构筑。
- 可游玩的语法内容；只保留能够承载语法的领域类型和接口。
- 初中、高中、CET6 内容包界面。
- 账号、云同步、排行榜和多人功能。
- AI 插画、LLM 富化及浏览器端第三方密钥调用。
- 原生移动应用和移动端专项适配。

发现范围外需求时，记录到 backlog，不插入当前里程碑。

## 3. 技术与工程约束

### 3.1 技术栈

- Node.js 20 或更高版本，npm。
- Vite、React、TypeScript strict mode。
- Zustand：仅管理 UI 和应用编排状态。
- Vitest：领域单元测试和基础设施测试。
- React Testing Library：组件行为测试。
- Playwright：关键用户旅程端到端测试。
- IndexedDB；可使用轻量封装库，但领域核心不得依赖它。
- CSV/TSV 使用成熟解析库，不自行实现完整 CSV 引号状态机。

### 3.2 核心约束

- `src/core/` 不依赖 React、DOM、Web Speech API 或 IndexedDB。
- 时间、随机数、ID 生成器通过参数或端口注入。
- UI 只提交“玩家做了什么”，不能直接写 `graded=true` 或修改 SRS 等级。
- 战斗基础数值不得读取学习掌握度。
- 敌人、遗物不得修改题目答案、SRS 资格或无障碍设置。
- SRS 状态和对应计分日志必须在同一 IndexedDB 事务中写入。
- 所有持久化对象包含 `schemaVersion`。
- 实验参数集中配置，不散落在组件或状态机内。

### 3.3 推荐目录

```text
src/
  app/                       # 应用启动、页面状态、错误边界
  core/
    config/                  # MVP 参数
    learning/                # 学习项目、练习、答案判断
    srs/                     # 资格、评分、状态转换、调度
    battle/                  # 纯战斗模型与 reducer
    session/                 # 三战流程、绑定、过载编排、结算
    content/                 # 内容包格式与校验
    import/                  # CSV/TSV 导入领域逻辑
  data/
    packs/                   # 内置内容包
  infra/
    indexeddb/               # 仓储、事务、迁移
    speech/                  # Web Speech API 适配器
    diagnostics/             # 本地事件和指标聚合
  ui/
    home/
    teaching/
    battle/
    reward/
    settlement/
    import/
    progress/
    settings/
    shared/
tests/
  e2e/
tools/
  content-validation/
```

## 4. 模块依赖

```text
learning ───────┐
                ├─→ srs ───────┐
content ────────┘               │
                                ├─→ session ─→ app/store ─→ UI
battle ─────────────────────────┘       │
                                       ├─→ indexeddb
import ─→ content ──────────────────────┤
speech ─────────────────────────────────┘
```

依赖只能沿箭头方向。`battle` 不认识 `SrsState`；`srs` 不认识生命值、卡牌伤害或 React 组件；`session` 是二者唯一的领域编排层。

## 5. 里程碑总览

| 里程碑 | 目标 | 包含任务 | 退出条件 |
|---|---|---|---|
| M0 工程基础 | 项目可构建、测试、检查 | T01–T02 | `npm run verify` 通过 |
| M1 学习核心 | 内容、答案、SRS、调度可独立运行 | T03–T06 | 所有 SRS 防刷用例通过 |
| M2 战斗核心 | 固定牌组和三种敌人可纯逻辑运行 | T07–T09 | 固定 seed 可复现完整战斗 |
| M3 会话纵切 | 教学、三战、奖励、结算领域流程贯通 | T10 | 无 UI 也能跑完整会话测试 |
| M4 数据能力 | 内容包、导入和持久化完成 | T11–T13 | 可导入、恢复、导出和重置 |
| M5 可玩版本 | 所有主要界面和交互完成 | T14–T18 | 浏览器可完成一局 |
| M6 验证候选 | 无障碍、诊断、E2E 和平衡完成 | T19–T21 | 发布检查清单全部通过 |

## 6. 开发任务

### T01：初始化工程与质量命令

**优先级：** P0

**依赖：** 无

**创建或修改：**

- `package.json`
- `vite.config.ts`
- `tsconfig.json`、`tsconfig.app.json`
- `eslint.config.js`
- `.gitignore`
- `src/main.tsx`
- `src/app/App.tsx`
- `src/app/app.css`

**工作项：**

- [ ] 创建 React + TypeScript Vite 工程，开启严格类型检查。
- [ ] 配置 Vitest、jsdom、React Testing Library 和 Playwright。
- [ ] 配置 ESLint；禁止 `src/core/` 引入 React 和 `src/infra/`。
- [ ] 添加命令：`dev`、`build`、`typecheck`、`lint`、`test`、`test:e2e`、`verify`。
- [ ] 创建推荐目录和最小应用入口。
- [ ] 固定 lockfile，不在同一个任务中引入业务代码。

**验收：**

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

以上命令均成功，浏览器能显示最小应用壳。

**建议提交：** `chore: scaffold web app and quality gates`

---

### T02：建立领域公共端口与实验配置

**优先级：** P0

**依赖：** T01

**创建：**

- `src/core/shared/ports.ts`
- `src/core/shared/result.ts`
- `src/core/config/mvp-balance.ts`
- `src/core/config/mvp-balance.test.ts`

**工作项：**

- [ ] 定义 `Clock`、`IdGenerator`、`RandomSource` 等纯接口。
- [ ] 定义领域错误和显式 `Result` 类型，避免 core 靠抛异常控制正常流程。
- [ ] 集中配置生命、能量、抽牌数、专注、语流阈值、间隔天数、导入限制。
- [ ] 为配置增加边界校验：非负数、合理上限、等级映射完整。
- [ ] 禁止 UI 直接 import 单个魔法数字。

**测试：** 配置缺级、负专注、无效牌组数量应被校验拒绝。

**完成标准：** 后续模块使用端口和配置，不直接调用 `Date.now()` 或 `Math.random()`。

**建议提交：** `feat(core): add shared ports and MVP configuration`

---

### T03：定义学习项目、内容包和练习模型

**优先级：** P0

**依赖：** T02

**创建：**

- `src/core/learning/model.ts`
- `src/core/content/model.ts`
- `src/core/content/validate-pack.ts`
- `src/core/content/validate-pack.test.ts`

**工作项：**

- [ ] 定义 `VocabularyUnit`、`GrammarUnit`、`LearningUnit`。
- [ ] 一个 `VocabularyUnit` 只代表一个目标词义，必须包含 `senseId`。
- [ ] 定义 `ExerciseKind`、`AnswerSpec`、`Exercise` 和 `ContentPack`。
- [ ] 定义内容来源、许可、课程标签和 `enrichmentStatus`。
- [ ] 实现内容包校验：ID 唯一、引用有效、完整项目有可用练习、pending 项不能启用。
- [ ] 保留语法模型和多练习引用，但不实现语法 UI。

**测试：**

- 重复 unit/exercise ID 被拒绝。
- exercise 引用不存在的 unit 被拒绝。
- 同词不同 `senseId` 可以共存。
- incomplete/pending 项不会进入可玩集合。
- GrammarUnit 少于约定练习数时内置包校验失败。

**完成标准：** 内容包只有通过校验后才能交给调度器。

**建议提交：** `feat(core): define learning and content pack models`

---

### T04：实现文本归一化、答案判断与题型选择

**优先级：** P0

**依赖：** T03

**创建：**

- `src/core/learning/normalize-text.ts`
- `src/core/learning/evaluate-answer.ts`
- `src/core/learning/select-exercise.ts`
- 对应 `*.test.ts`

**工作项：**

- [ ] 实现 Unicode NFC、首尾空白处理、连续空白折叠和可配置大小写处理。
- [ ] 支持 choice、text、token-order 三类答案。
- [ ] 轻微拼写差异只能返回 `needsConfirmation`，不能自动判对。
- [ ] 根据掌握度选择词汇题型。
- [ ] L4 听音不可用时回退到等强度的看义拼词，而不是泄露答案。
- [ ] 选择练习时避开近期已用 exercise；语法接口同样支持轮换。

**测试：** 覆盖大小写、NFC、短语空格、多个正确答案、错误选项、近似拼写和练习轮换。

**完成标准：** 相同输入始终得到相同结果，答案判断不依赖 UI 文案。

**建议提交：** `feat(core): evaluate answers and select exercises`

---

### T05：实现 SRS 状态机与到期窗口防刷

**优先级：** P0

**依赖：** T02、T04

**创建：**

- `src/core/srs/model.ts`
- `src/core/srs/teaching.ts`
- `src/core/srs/eligibility.ts`
- `src/core/srs/grade-recall.ts`
- `src/core/srs/record-recall.ts`
- `src/core/srs/srs.test.ts`

**工作项：**

- [ ] 定义 `Mastery`、`SrsState`、`RecallLog`、`RecallGrade`。
- [ ] 教学：L0 → L1、间隔 1 天、`graded=false`。
- [ ] 资格必须同时检查教学状态、`dueAt`、`lastGradedDueAt` 和题型要求。
- [ ] `good`：升一级并采用 3/7/15/30 天间隔。
- [ ] `hard`：不升级，保持当前间隔。
- [ ] `again`：最多降一级、最低 L1、次日重试。
- [ ] 计分时先保存旧 `dueAt` 为 `lastGradedDueAt`，再生成新 `dueAt`。
- [ ] 到期前练习、重复练习和直接出牌均不改变状态。
- [ ] 只暴露 `recordRecall(facts)` 作为外部计分入口；调用方不能指定 graded。

**关键测试：**

- [ ] 重开新 session 不能给同一到期窗口再次计分。
- [ ] 同一会话第二次回答只产生练习日志。
- [ ] L5 正确进入维护，L5 错误只回 L4。
- [ ] 答错不会回到 L0。
- [ ] 同词不同义的状态完全隔离。
- [ ] 使用提示后的正确答案得到 hard。

**完成标准：** 设计文档中的 SRS 自动化验收项全部通过。

**建议提交：** `feat(core): implement due-window SRS state machine`

---

### T06：实现学习集合调度器

**优先级：** P0

**依赖：** T03、T05

**创建：**

- `src/core/srs/schedule-learning-set.ts`
- `src/core/srs/schedule-learning-set.test.ts`

**工作项：**

- [ ] 先取最多 8 个到期项目，按 dueAt、掌握度、lapses 排序。
- [ ] 按设置加入 0–4 个新项目，默认 4。
- [ ] 空位用未到期练习项目填充。
- [ ] 不使用 pending/incomplete 项，不重复同一 unit。
- [ ] 超额到期项目保持原状态，不能被新词挤掉。
- [ ] 生成稳定的 `LearningSetSnapshot`，恢复或重新预览不重抽。

**测试：** 边界数量、排序、零新词、全新用户、超额到期、候选不足和稳定快照。

**完成标准：** 相同输入和 seed 产生相同学习集合。

**建议提交：** `feat(core): schedule stable learning sets`

---

### T07：定义战斗模型、随机数与固定内容

**优先级：** P0

**依赖：** T02

**创建：**

- `src/core/battle/model.ts`
- `src/core/battle/rng.ts`
- `src/core/battle/mvp-cards.ts`
- `src/core/battle/mvp-enemies.ts`
- `src/core/battle/mvp-relics.ts`
- 对应测试

**工作项：**

- [ ] 定义 `CardTemplate`、`CombatCardInstance`、`CombatEffect`、`BattleState`、`Intent`。
- [ ] `learningUnitId` 可选；中性卡不可过载。
- [ ] 实现可序列化的 seeded RNG 和 shuffle。
- [ ] 配置 12 张初始牌组：4 打击、4 防御、重击、固守、洞察、干扰。
- [ ] 配置墨团、回声蝠和遗忘守卫。
- [ ] 配置词根罗盘、错题本和语流护符。
- [ ] 数据定义不能引用 SRS 类型或修改学习日志。

**测试：** 固定 seed 洗牌稳定；牌组数量和类型正确；敌人意图循环稳定；配置引用有效。

**建议提交：** `feat(core): define deterministic battle fixtures`

---

### T08：实现纯战斗 reducer

**优先级：** P0

**依赖：** T07

**创建：**

- `src/core/battle/create-battle.ts`
- `src/core/battle/reduce-battle.ts`
- `src/core/battle/battle-selectors.ts`
- `src/core/battle/battle.test.ts`

**工作项：**

- [ ] 创建战斗、抽牌、出牌、弃牌、洗牌、结束回合和敌人行动。
- [ ] 实现能量、伤害、格挡、虚弱和抽牌。
- [ ] 格挡在拥有者下一回合开始时清零。
- [ ] 实现胜利、失败和不可执行动作的显式错误。
- [ ] 实现遗物的纯战斗触发，但不处理 RecallLog。
- [ ] 返回新的不可变状态和领域事件，避免原地修改。

**测试：**

- 费用不足不能出牌。
- 卡牌基础伤害在不同掌握度下完全一致。
- 虚弱、格挡和连击按明确顺序结算。
- 同 seed、同动作序列得到同结果。
- 玩家或敌人死亡后不能继续执行回合动作。

**完成标准：** 可用测试代码无 UI 地完成任意一场战斗。

**建议提交：** `feat(core): implement deterministic battle reducer`

---

### T09：实现过载、专注、语流与勇气奖励

**优先级：** P0

**依赖：** T04、T05、T08

**创建：**

- `src/core/session/prepare-overcharge.ts`
- `src/core/session/resolve-overcharge.ts`
- `src/core/session/overcharge.test.ts`

**工作项：**

- [ ] 检查卡牌有学习铭文且专注大于 0。
- [ ] 从学习项目和掌握度选择练习。
- [ ] 过载开始时锁定 exercise，提交答案时不能重新抽题。
- [ ] 正确、提示后正确、错误分别映射为战斗加成和 RecallLog 事实。
- [ ] 错误仍执行完整基础卡牌效果，语流最多下降 1。
- [ ] 正确增加语流；达到阈值后安排下回合额外能量。
- [ ] 每项目每战第一次主动尝试低掌握或到期内容时发放勇气奖励。
- [ ] 同项目不能重复领取勇气奖励。
- [ ] 响应时间只记录，不影响 MVP 战斗奖励或 SRS 评分。

**测试：** 无专注、中性卡、正确、错误、提示、到期/未到期、重复尝试和语流阈值。

**完成标准：** 过载编排只调用 battle 和 srs 的公开接口，不跨层改状态。

**建议提交：** `feat(core): orchestrate overcharge learning rewards`

---

### T10：实现完整会话状态机

**优先级：** P0

**依赖：** T06、T08、T09

**创建：**

- `src/core/session/model.ts`
- `src/core/session/create-session.ts`
- `src/core/session/complete-teaching.ts`
- `src/core/session/session-reducer.ts`
- `src/core/session/settlement.ts`
- `src/core/session/session.test.ts`

**会话阶段：**

```text
setup → teaching → battle-1 → relic-reward
      → battle-2 → heal-reward → boss
      → settlement | defeat
```

**工作项：**

- [ ] 创建会话并保存学习集合快照、seed、sessionId 和阶段。
- [ ] 战前逐项完成教学，生成教学日志并将 L0 变为 L1。
- [ ] 把学习集合与 12 张卡牌一对一绑定；空位保持中性。
- [ ] 三场战斗之间保留玩家生命和所选遗物。
- [ ] 第一战三选一遗物，第二战固定回血，Boss 后结算。
- [ ] 失败直接进入 defeat，但保留已发生的有效日志。
- [ ] 计算到期项目数、尝试数、专注使用率、答题结果和下次 dueAt。

**关键集成测试：**

- 从全新 30 词包创建会话并教学 4 个新项目。
- 无 UI 完成三战后进入 settlement。
- 失败后仍能获取有效学习日志。
- 恢复同一快照后 sessionId、学习集合和卡牌绑定不变。
- 直接出牌通关不会错误推进 SRS。

**完成标准：** M3 退出条件满足，核心纵切无需浏览器即可运行。

**建议提交：** `feat(core): implement three-encounter session flow`

---

### T11：制作并验证 CET4 30 词内容包

**优先级：** P0

**依赖：** T03、T04

**创建：**

- `src/data/packs/cet4-mvp.json`
- `src/data/packs/index.ts`
- `tools/content-validation/validate-packs.ts`
- `src/data/packs/cet4-mvp.test.ts`

**工作项：**

- [ ] 选择 30 个适合目标测试用户的 CET4 词义，不按单词字符串粗暴合并多义词。
- [ ] 每项提供释义、词性、音标、例句、接受答案和来源信息。
- [ ] 为 L1–L4 提供可用练习或可确定性生成练习。
- [ ] 选择题干扰项必须词性和粒度相近，不能出现明显长度泄漏。
- [ ] 保存数据来源和许可，不复制不明确可商用词典内容。
- [ ] 添加内容校验脚本并接入 `npm run verify`。

**验收：** 30 个完整且可玩的 VocabularyUnit；无重复 ID、空答案、悬空练习或缺失来源。

**建议提交：** `feat(content): add validated CET4 MVP pack`

---

### T12：实现 CSV/TSV 导入领域逻辑

**优先级：** P0

**依赖：** T03、T11

**创建：**

- `src/core/import/model.ts`
- `src/core/import/parse-table.ts`
- `src/core/import/map-columns.ts`
- `src/core/import/build-imported-pack.ts`
- `src/core/import/error-report.ts`
- `src/core/import/fixtures/*`
- 对应测试

**工作项：**

- [ ] 支持 CSV/TSV 引号、逗号、换行、UTF-8 BOM。
- [ ] 检测分隔符，输出表头、预览行和逐行错误。
- [ ] 支持 term、definition、phonetic、partOfSpeech、example、exampleZh、tags 映射。
- [ ] 标准化匹配键但保留原始展示大小写。
- [ ] 以 `normalizedTerm + definition` 去重；同词不同义保留。
- [ ] 缺释义时使用有许可的内置内容候选匹配；多个词义必须由用户选择。
- [ ] 未补全项目为 pending，不能进入战斗。
- [ ] 限制 5 MB 和 5,000 行。
- [ ] 下载错误报告时防止表格公式注入。

**测试夹具：** 带逗号释义、带换行例句、BOM、TSV、重复、多义词、缺释义、非法行、超限文件和公式开头单元格。

**完成标准：** 领域层可以产生导入预览和合法 ContentPack，不依赖文件选择 UI。

**建议提交：** `feat(core): parse and validate custom vocabulary imports`

---

### T13：实现 IndexedDB、事务与恢复

**优先级：** P0

**依赖：** T05、T10、T12

**创建：**

- `src/infra/indexeddb/schema.ts`
- `src/infra/indexeddb/database.ts`
- `src/infra/indexeddb/srs-repository.ts`
- `src/infra/indexeddb/content-repository.ts`
- `src/infra/indexeddb/session-repository.ts`
- `src/infra/indexeddb/settings-repository.ts`
- `src/infra/indexeddb/export-data.ts`
- 对应 `fake-indexeddb` 测试

**对象存储：**

- `contentPacks`
- `srsStates`
- `recallLogs`
- `sessionSnapshots`
- `settings`
- `diagnosticEvents`

**工作项：**

- [ ] 定义 schemaVersion=1 和升级入口。
- [ ] 实现 SRS 状态 + RecallLog 同事务写入。
- [ ] 保存与恢复会话快照，不生成新 sessionId。
- [ ] 保存自定义内容包和设置。
- [ ] 实现 JSON 数据导出和确认后的全量重置。
- [ ] 读取失败或迁移失败时返回可恢复错误，不静默清空数据。

**测试：** 事务回滚、快照恢复、导入包持久化、导出结构、清空、未知 schema 处理。

**完成标准：** 刷新页面可以恢复同一会话，且不能借恢复重复计分。

**建议提交：** `feat(infra): persist learning and session data atomically`

---

### T14：建立应用状态与页面流程

**优先级：** P0

**依赖：** T10、T11、T13

**创建：**

- `src/app/app-store.ts`
- `src/app/app-screen.ts`
- `src/app/bootstrap.ts`
- `src/app/App.tsx`
- `src/app/ErrorBoundary.tsx`
- 对应组件测试

**工作项：**

- [ ] 应用启动时加载内置包、自定义包、设置和未完成快照。
- [ ] 用显式页面状态承载 home、teaching、battle、reward、settlement、defeat、import、progress、settings。
- [ ] store 只编排 core 与 repository，不重写领域规则。
- [ ] 每次领域动作成功后保存必要快照和日志。
- [ ] 处理加载、空数据、损坏内容包和存储失败状态。
- [ ] 提供继续上次会话、放弃会话和重置数据入口。

**完成标准：** store 的核心流程有测试，刷新后能够回到正确页面和阶段。

**建议提交：** `feat(app): orchestrate persisted MVP screen flow`

---

### T15：实现主页与战前教学界面

**优先级：** P0

**依赖：** T14

**创建：**

- `src/ui/home/HomeScreen.tsx`
- `src/ui/teaching/TeachingScreen.tsx`
- `src/ui/shared/PackCard.tsx`
- 对应测试和样式

**工作项：**

- [ ] 展示 CET4 和可用自定义内容包。
- [ ] 展示到期数量和新项目配额 0–4。
- [ ] 支持开始、继续和进入导入向导。
- [ ] 教学页展示词义、词性、音标、发音、例句和进度。
- [ ] 教学完成才允许进入战斗；跳过整个教学会话时不创建已教学状态。
- [ ] 所有交互支持键盘，焦点顺序稳定。

**组件测试：** 选择包、修改配额、恢复会话、逐项教学、语音按钮不可用状态。

**建议提交：** `feat(ui): add home and pre-battle teaching flow`

---

### T16：实现战斗与过载界面

**优先级：** P0

**依赖：** T14、T15

**创建：**

- `src/ui/battle/BattleScreen.tsx`
- `src/ui/battle/EnemyIntent.tsx`
- `src/ui/battle/CombatCard.tsx`
- `src/ui/battle/BattleHud.tsx`
- `src/ui/battle/OverchargeDock.tsx`
- `src/ui/battle/RecallFeedback.tsx`
- 对应测试和样式

**工作项：**

- [ ] 显示玩家/敌人生命、格挡、能量、专注、语流和敌人意图。
- [ ] 卡牌同时展示战斗效果和学习铭文；中性卡明确不可过载。
- [ ] 选牌后提供“直接打出”和“过载后打出”，不自动弹题。
- [ ] 过载题在当前战斗界面的 dock 中完成，不跳转页面。
- [ ] 支持选择题、拼写题、提示、近似拼写确认、取消和反馈确认。
- [ ] 错误后仍展示并执行基础效果。
- [ ] 反馈区域使用 `aria-live`，答案不会一闪而过。
- [ ] 键盘支持手牌选择、确认、取消和结束回合。

**关键组件测试：** 直接打出、过载正确、过载错误、专注耗尽、中性卡、键盘路径和反馈焦点恢复。

**完成标准：** 不使用鼠标也能完成一场战斗。

**建议提交：** `feat(ui): build battle and overcharge experience`

---

### T17：实现奖励、失败、结算与进度界面

**优先级：** P0

**依赖：** T16

**创建：**

- `src/ui/reward/RelicRewardScreen.tsx`
- `src/ui/reward/HealRewardScreen.tsx`
- `src/ui/settlement/SettlementScreen.tsx`
- `src/ui/settlement/DefeatScreen.tsx`
- `src/ui/progress/ProgressScreen.tsx`
- 对应测试

**工作项：**

- [ ] 第一战后展示三个遗物三选一。
- [ ] 第二战后执行固定回血并显示结果。
- [ ] 失败界面明确说明学习记录已经保存，不附加降级惩罚。
- [ ] 结算展示到期覆盖率、专注使用率、正确/提示/错误、易错项和下次复习。
- [ ] 不使用单一总分或羞辱性等级。
- [ ] 进度页按内容包和掌握度展示数量，并提供数据导出入口。

**完成标准：** 三战胜利与中途失败两条流程都有完整出口。

**建议提交：** `feat(ui): add rewards settlement and progress screens`

---

### T18：实现导入向导与设置界面

**优先级：** P0

**依赖：** T12、T13、T14

**创建：**

- `src/ui/import/ImportWizard.tsx`
- `src/ui/import/FileStep.tsx`
- `src/ui/import/MappingStep.tsx`
- `src/ui/import/PreviewStep.tsx`
- `src/ui/import/ResolveStep.tsx`
- `src/ui/import/ImportResult.tsx`
- `src/ui/settings/SettingsScreen.tsx`
- 对应测试

**工作项：**

- [ ] 支持文件选择和粘贴文本。
- [ ] 显示分隔符、编码、列映射和前 10 行预览。
- [ ] 处理多义词候选选择和缺释义补全。
- [ ] 确认页展示新增、重复、pending 和错误数量。
- [ ] 确认后单事务保存内容包。
- [ ] 支持下载安全错误报告。
- [ ] 设置页提供减少动画、计时提示、语音开关、数据导出和重置。

**完成标准：** 导入一份最小词表后，主页立即出现新内容包，并能用它创建会话。

**建议提交：** `feat(ui): add vocabulary import wizard and settings`

---

### T19：完成语音适配与无障碍加固

**优先级：** P0

**依赖：** T15–T18

**创建或修改：**

- `src/infra/speech/speech-adapter.ts`
- `src/ui/shared/FocusManager.tsx`
- `src/ui/shared/VisuallyHidden.tsx`
- `tests/e2e/keyboard-flow.spec.ts`
- `tests/e2e/reduced-motion.spec.ts`

**工作项：**

- [ ] 检测 Web Speech API、英语语音和播放失败。
- [ ] 听音不可用时切换到等强度替代题。
- [ ] 页面和 dialog 切换时管理焦点，关闭后恢复到触发控件。
- [ ] 检查所有控件名称、错误提示、状态变化和阅读顺序。
- [ ] 正确/错误、费用和意图不只依赖颜色。
- [ ] `prefers-reduced-motion` 和应用设置都能关闭非必要动画。
- [ ] 200% 缩放下完成主要流程，不出现不可操作裁切。
- [ ] 用自动化扫描辅助检查，但保留键盘和屏幕阅读器人工检查。

**完成标准：** 从主页到结算的核心流程可全键盘完成；语音不可用不阻塞游戏。

**建议提交：** `feat(a11y): harden keyboard focus motion and speech fallback`

---

### T20：实现本地诊断事件与 MVP 指标

**优先级：** P0

**依赖：** T10、T13、T17

**创建：**

- `src/infra/diagnostics/model.ts`
- `src/infra/diagnostics/collector.ts`
- `src/infra/diagnostics/metrics.ts`
- `src/infra/diagnostics/export-diagnostics.ts`
- 对应测试

**事件至少包括：**

- `session_started`
- `teaching_completed`
- `battle_started` / `battle_completed`
- `card_played_direct`
- `overcharge_started` / `overcharge_resolved`
- `due_unit_attempted`
- `session_completed` / `session_abandoned`
- `import_completed`

**工作项：**

- [ ] 事件只保存匿名本地 ID、时间、状态和数值，不保存自由输入答案或导入原文。
- [ ] 计算会话完成率所需状态、专注使用率、到期项目尝试覆盖率和退出位置。
- [ ] 将诊断数据加入用户主动导出的 JSON，不自动上传。
- [ ] 在结算页显示本局关键指标。
- [ ] 为以后接入用户同意后的远程分析保留端口，但 MVP 不发送网络请求。

**完成标准：** 一局结束后可导出完整但不含敏感原文的诊断数据。

**建议提交：** `feat(metrics): collect local MVP validation events`

---

### T21：端到端验证、平衡与发布候选

**优先级：** P0

**依赖：** T01–T20

**创建：**

- `tests/e2e/fresh-session.spec.ts`
- `tests/e2e/direct-play.spec.ts`
- `tests/e2e/due-window.spec.ts`
- `tests/e2e/defeat.spec.ts`
- `tests/e2e/import-pack.spec.ts`
- `tests/e2e/resume-session.spec.ts`
- `docs/testing/mvp-playtest-protocol.md`
- `README.md`

**必须自动化的用户旅程：**

- [ ] 首次用户选择 CET4、教学 4 个新词、完成三战并看到结算。
- [ ] 全程直接出牌不会推进任何 SRS 状态。
- [ ] 到期作答只计分一次，刷新和恢复后仍不能重复计分。
- [ ] 战斗失败保存已经发生的有效日志。
- [ ] 导入 CSV 后使用自定义包开局。
- [ ] 语音 API 不可用时使用替代题完成一局。
- [ ] 键盘完成主要路径。

**平衡检查：**

- [ ] 使用固定 seeds 批量模拟三场战斗，确认没有明显必败或无脑必赢组合。
- [ ] 人工试玩检查平均单战 3–5 分钟、整局 10–15 分钟。
- [ ] 检查专注是否形成选择；若玩家每次机械地耗尽专注，记录为实验结果，不临时增加惩罚。
- [ ] 检查到期项目尝试覆盖率，而不仅是总过载次数。

**发布门禁：**

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

并完成：

- [ ] 无 P0/P1 已知缺陷。
- [ ] 没有未处理 Promise rejection 或生产 console error。
- [ ] 无第三方密钥、测试用户答案或私有数据进入产物。
- [ ] 数据来源和许可已经审查。
- [ ] Chrome、Edge、Safari 当前稳定版完成冒烟测试。
- [ ] 准备至少 10 名目标用户的试玩协议、基线题、24 小时和 7 天复测表。

**建议提交：** `test: complete MVP release validation`

## 7. 任务依赖与可并行性

### 7.1 严格关键路径

```text
T01 → T02 → T03 → T04 → T05 → T06
                    └────→ T07 → T08
T06 + T08 + T09 → T10 → T14 → T15 → T16 → T17
T03 → T11 → T12 → T13 → T14
T17 + T18 → T19 → T21
T10 + T13 + T17 → T20 → T21
```

### 7.2 可以并行的工作

- T05（SRS）和 T07–T08（战斗）在 T04 完成后可以并行。
- T11（CET4 内容包）可以与 T07–T10 并行，但必须使用已经稳定的内容 schema。
- T12（导入核心）可以与战斗 UI 开发并行。
- T19 的无障碍检查应从 T15 开始持续执行，任务本身是最终加固，不是第一次考虑无障碍。
- 视觉样式可与 T15–T18 并行，但不得改变领域接口或引入范围外页面。

## 8. 每个任务的完成定义

每个任务只有同时满足以下条件才能勾选完成：

- [ ] 实现和测试均在任务声明范围内。
- [ ] 新增领域行为至少有一个失败测试先证明需求，再实现通过。
- [ ] `npm run lint`、`npm run typecheck`、相关测试通过。
- [ ] 没有跳过测试、注释掉断言或遗留临时占位。
- [ ] 公共接口和异常边界有简短注释。
- [ ] 没有顺手实现后续路线图功能。
- [ ] 提交只包含该任务相关文件，提交信息能描述用户或领域结果。

## 9. 建议提交序列

```text
chore: scaffold web app and quality gates
feat(core): add shared ports and MVP configuration
feat(core): define learning and content pack models
feat(core): evaluate answers and select exercises
feat(core): implement due-window SRS state machine
feat(core): schedule stable learning sets
feat(core): define deterministic battle fixtures
feat(core): implement deterministic battle reducer
feat(core): orchestrate overcharge learning rewards
feat(core): implement three-encounter session flow
feat(content): add validated CET4 MVP pack
feat(core): parse and validate custom vocabulary imports
feat(infra): persist learning and session data atomically
feat(app): orchestrate persisted MVP screen flow
feat(ui): add home and pre-battle teaching flow
feat(ui): build battle and overcharge experience
feat(ui): add rewards settlement and progress screens
feat(ui): add vocabulary import wizard and settings
feat(a11y): harden keyboard focus motion and speech fallback
feat(metrics): collect local MVP validation events
test: complete MVP release validation
```

## 10. MVP 完成判定

只有满足以下条件，才能把 v0.1 标记为完成：

- 玩家可以从空数据开始完成教学、三场战斗和结算。
- 玩家可以完全不答题并正常战斗，且 SRS 不被修改。
- 到期回忆无法通过重开、刷新、恢复或重复作答刷进度。
- 新词和低掌握词没有基础战力惩罚。
- 自定义词表可以导入、预览、修复、保存并进入游戏。
- 数据可恢复、导出和清空，存储失败不会静默丢数据。
- Web Speech API 不可用时仍能完成全部流程。
- 核心路径可以只用键盘完成。
- 所有自动化门禁通过，并完成至少一次跨浏览器人工冒烟测试。
- 已准备正式试玩协议，能够采集设计文档要求的游戏性与学习性指标。

通过以上判定后，才进入 v0.2 的地图、商店、事件和完整构筑设计；不得把这些功能提前混入 MVP。
