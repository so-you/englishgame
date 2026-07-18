# 英语爬塔（English Roguelike）

一款把英语词汇复习放进卡牌 Roguelike 战斗的本地优先 Web 游戏。玩家先安全学习新内容，再通过“过载回忆”强化卡牌；答错仍会执行卡牌基础效果，不用惩罚换取学习真实性。

## MVP 能力

- 固定三战流程：2 场普通战、遗物奖励、固定恢复、1 场 Boss 战和学习结算。
- 双层卡牌：战斗模板与词汇学习项目独立，掌握度不会削弱基础战力。
- 间隔复习：到期窗口只计分一次，刷新、恢复和重复作答不能刷进度。
- CET4 原创 MVP 内容包：30 个原子词义、120 道 L1–L4 练习，标注 CC0-1.0。
- 自定义词表：CSV/TSV 文件或粘贴文本、列映射、预览、去重、多义词选择、手工补释义、安全错误报告。
- 本地数据：IndexedDB 自动存档、恢复、JSON 导出和双重确认重置。
- 无障碍：键盘主路径、页面焦点管理、减少动画、语音失败降级和非听力替代题。
- 本地匿名诊断：只记录状态和数值，不记录答案或导入原文，也不自动上传。

当前 MVP 自带 CET4 小型验证包；初中、高中、CET6/考研等分级内容可按相同 `ContentPack` 格式扩展，自定义导入已经可用。

## 开发环境

- Node.js ≥ 20.19
- npm

```bash
npm ci
npm run dev
```

开发服务器默认由 Vite 启动。生产构建：

```bash
npm run build
```

## 质量命令

```bash
npm run validate:content  # 校验内置内容包
npm run lint
npm run typecheck
npm run test              # Vitest 单元/组件/集成测试
npm run test:e2e          # Playwright Chromium 端到端测试
npm run verify            # 内容、lint、类型、单测、构建
```

首次在新机器运行浏览器测试时，若 Playwright 提示缺少浏览器二进制，再执行：

```bash
npx playwright install chromium
```

## 自定义词表格式

最小 CSV：

```csv
word,meaning
planet,行星
forest,森林
```

支持的字段别名包括英文或中文的词汇、释义、音标、词性、例句、例句翻译和标签。英文词汇列必填；缺少释义的项目可以在向导中补全，也可以保存为 `pending`，但 pending 项不会进入学习或战斗。

安全限制：单次最多 5 MB、5000 行；错误报告会中和电子表格公式前缀。

## 架构

```text
src/core/       纯 TypeScript 领域规则：learning / srs / battle / session / import
src/data/       内置内容包
src/infra/      IndexedDB、语音适配、本地诊断
src/app/        Zustand 编排、启动恢复、页面路由
src/ui/         React 页面与组件
tests/e2e/      真实浏览器用户旅程
tools/          内容校验工具
```

领域核心不依赖 React、DOM 或 IndexedDB；随机数和时间通过边界注入。SRS 状态、回忆日志与会话快照使用事务持久化。

详细设计和实现计划：

- [最终设计文档](docs/superpowers/specs/2026-07-18-vocab-roguelike-design.md)
- [MVP 实现计划](docs/superpowers/plans/2026-07-18-vocab-roguelike-mvp-implementation-plan.md)
- [试玩协议](docs/testing/mvp-playtest-protocol.md)

## 数据与隐私

应用不需要账号，MVP 不包含第三方 API 密钥，也不发送远程分析请求。学习记录、导入内容和诊断事件只保存在用户浏览器中，除非用户主动导出。

内置 CET4 MVP 内容为项目原创内容，来源字段为 `English Roguelike original CET4 MVP content`，许可为 `CC0-1.0`。
