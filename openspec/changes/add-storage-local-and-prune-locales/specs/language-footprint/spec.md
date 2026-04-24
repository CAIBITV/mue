## ADDED Requirements

### Requirement: 系统仅保留中文与英文运行时语言
系统 SHALL 仅保留 `zh_CN` 与 `en_US` 两种语言配置作为运行时可选语言。

#### Scenario: 用户打开语言选择
- **GIVEN** 用户进入语言设置或欢迎页语言选择
- **WHEN** 系统展示语言列表
- **THEN** 列表中只应出现中文与英文

#### Scenario: 浏览器语言非中文
- **GIVEN** 用户浏览器语言不是中文
- **WHEN** 系统初始化语言
- **THEN** 系统应回落到英文

### Requirement: 删除多余语言后系统仍可正常加载文案
系统 SHALL 在移除多余语言文件后，确保现有 UI 文案仍可正确解析。

#### Scenario: 启动扩展页面
- **GIVEN** 系统只保留中英语言文件
- **WHEN** 用户打开新标签页或 popup
- **THEN** 应能正常初始化翻译系统
- **AND** 不得因缺失语言文件导致崩溃
