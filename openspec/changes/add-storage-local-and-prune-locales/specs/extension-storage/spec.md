## ADDED Requirements

### Requirement: 扩展设置应存储在扩展专用 storage.local 中
系统 SHALL 使用扩展提供的 `storage.local` 作为用户设置、快捷方式和偏好配置的主存储。

#### Scenario: 在 Chromium 浏览器中保存设置
- **GIVEN** 用户在 Chrome 或 Edge 中修改设置
- **WHEN** 系统写入配置
- **THEN** 数据应保存到扩展专用 `storage.local`
- **AND** 不应再依赖 `window.localStorage` 作为主存储

#### Scenario: 在 Firefox 中保存设置
- **GIVEN** 用户在 Firefox 中修改设置
- **WHEN** 系统写入配置
- **THEN** 数据应保存到 `browser.storage.local`

### Requirement: 旧 localStorage 数据应被自动迁移
系统 SHALL 在检测到旧版 `localStorage` 数据且尚未完成迁移时，自动将其迁移到新存储。

#### Scenario: 首次升级后启动
- **GIVEN** 用户已有旧版 `localStorage` 设置
- **AND** 新存储中尚无迁移标记
- **WHEN** 用户首次打开扩展页面
- **THEN** 系统应自动迁移旧数据到 `storage.local`
- **AND** 保持原有设置键与取值不变

#### Scenario: 已迁移用户再次启动
- **GIVEN** 用户已完成迁移
- **WHEN** 用户再次打开扩展页面
- **THEN** 系统不得重复污染数据
- **AND** 应继续从新存储读取设置
