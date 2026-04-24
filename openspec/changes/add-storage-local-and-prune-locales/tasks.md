## 1. Spec
- [x] 1.1 定义扩展专用存储迁移需求
- [x] 1.2 定义语言裁剪到中英的需求

## 2. Implementation
- [x] 2.1 新增统一扩展存储适配层
- [x] 2.2 实现旧 `localStorage` 到 `storage.local` 的迁移逻辑
- [x] 2.3 将应用初始化与关键设置读取切换到新存储层
- [x] 2.4 清理多余语言文件与语言映射，仅保留 `zh_CN` 与 `en_US`
- [x] 2.5 更新语言选择与默认语言逻辑

## 3. Validation
- [x] 3.1 运行 `openspec validate add-storage-local-and-prune-locales --strict`
- [x] 3.2 运行 `bun run build`
- [ ] 3.3 验证旧用户设置可自动迁移
- [ ] 3.4 验证界面仅显示中文与英文选项
