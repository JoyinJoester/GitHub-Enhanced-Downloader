# 贡献指南 / Contributing Guide

感谢您对 GitHub Enhanced Downloader 项目的关注！我们欢迎各种形式的贡献。

## 🤝 如何贡献

### 报告问题 / Reporting Issues
- 使用 [GitHub Issues](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader/issues) 报告Bug
- 提供详细的复现步骤和环境信息
- 包含相关的错误截图或日志

### 提交功能请求 / Feature Requests
- 在 Issues 中详细描述您希望的功能
- 解释该功能的使用场景和价值
- 参与讨论完善功能设计

### 代码贡献 / Code Contribution

#### 开发环境设置
1. Fork 本仓库
2. 克隆到本地：`git clone https://github.com/your-username/GitHub-Enhanced-Downloader.git`
3. 创建功能分支：`git checkout -b feature/your-feature-name`

#### 代码规范
- 使用有意义的变量和函数名
- 添加必要的注释，特别是复杂逻辑
- 保持代码简洁和可读性
- 遵循现有的代码风格

#### 提交规范
```bash
# 功能添加
git commit -m "feat: 添加自定义镜像配置功能"

# Bug修复
git commit -m "fix: 修复版本分组排序问题"

# 文档更新
git commit -m "docs: 更新README安装说明"

# 性能优化
git commit -m "perf: 优化Release数据加载速度"
```

#### Pull Request流程
1. 确保您的代码通过了基本测试
2. 更新相关文档（如果需要）
3. 创建 Pull Request 并详细描述您的更改
4. 等待代码审查和反馈
5. 根据反馈修改代码（如果需要）

### 国际化贡献 / Internationalization
我们欢迎添加新的语言支持：

1. 在 `_locales/` 目录下创建新的语言文件夹（如 `fr` 表示法语）
2. 复制 `en/messages.json` 到新文件夹
3. 翻译所有消息文本
4. 测试新语言的显示效果
5. 提交 Pull Request

### 文档贡献 / Documentation
- 改进 README.md
- 添加使用教程
- 修正错误或过时信息
- 添加更多示例

## 📋 开发指南

### 项目结构
```
├── manifest.json      # 扩展配置
├── background.js      # 后台脚本
├── content.js         # 内容脚本  
├── popup.html         # 设置页面
├── popup.js           # 设置逻辑
└── _locales/          # 语言包
    ├── en/
    ├── zh_CN/
    └── ja/
```

### 调试技巧
1. 在 `chrome://extensions/` 中重新加载扩展
2. 使用 Chrome 开发者工具调试
3. 查看控制台错误信息
4. 使用 `console.log()` 输出调试信息

### 测试清单
- [ ] 在不同的GitHub仓库页面测试
- [ ] 验证镜像链接是否正确生成
- [ ] 检查版本分组功能
- [ ] 测试设置页面的保存/加载
- [ ] 验证多语言显示

## 🏷️ 版本发布

我们使用 [语义化版本](https://semver.org/lang/zh-CN/)：
- `MAJOR.MINOR.PATCH`
- 主版本号：不兼容的API修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

## 🎯 路线图 / Roadmap

### 即将到来的功能
- [ ] 支持更多镜像站点
- [ ] 添加下载进度显示
- [ ] 支持批量下载
- [ ] 添加深色主题
- [ ] 支持更多Git托管平台

### 长期计划
- [ ] 移动端支持
- [ ] 离线缓存功能
- [ ] 统计和分析功能

## 📞 联系我们

如果您有任何问题或建议，请通过以下方式联系：

- 📧 Email: joyinjoester@gmail.com
- 💬 GitHub Discussions: [项目讨论区](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader/discussions)
- 🐛 Issues: [问题报告](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader/issues)

## 🙏 致谢

感谢所有贡献者为项目做出的努力！

### 贡献者列表
<!-- 这里会自动生成贡献者列表 -->

---

**再次感谢您的贡献！每一个贡献都让这个项目变得更好。** 🎉
