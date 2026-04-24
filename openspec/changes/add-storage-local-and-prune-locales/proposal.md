# Change: 迁移扩展存储到 storage.local 并裁剪语言到中英

## Why
当前项目大量依赖扩展页面的 `window.localStorage` 保存用户设置与快捷方式。该方式不利于跨浏览器扩展最佳实践，也不会落入扩展专用存储目录。与此同时，项目维护了大量语言文件，但当前实际需求只需要中文和英文，继续保留全部语言会增加维护负担与构建体积。

## What Changes
- 新增统一扩展存储适配层，优先使用 `browser.storage.local` / `chrome.storage.local`
- 增加一次性迁移逻辑，将旧 `localStorage` 数据搬运到 `storage.local`
- 逐步将核心设置读取入口切换到统一存储层
- 将语言配置收缩到 `zh_CN` 与 `en_US`
- 清理不再使用的语言文件、语言映射与相关 UI 选项

## Impact
- Affected specs:
  - `extension-storage`
  - `language-footprint`
- Affected code:
  - `src/utils/settings/*`
  - `src/lib/translations.js`
  - `src/index.jsx`
  - `src/config/variables.js`
  - 各功能模块中的设置读取逻辑
  - `manifest/chrome.json`
  - `manifest/firefox.json`
