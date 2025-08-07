# 🚀 GitHub Enhanced Downloader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.2.0-green.svg)](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader)
[![GitHub stars](https://img.shields.io/github/stars/JoyinJoester/GitHub-Enhanced-Downloader.svg)](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/JoyinJoester/GitHub-Enhanced-Downloader.svg)](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader/issues)

> 🌟 一个强大的Chrome扩展，为GitHub仓库页面添加快速下载按钮，支持镜像加速和智能版本分组

[English](#english) | [中文说明](#中文说明) | [日本語](#日本語)

## ✨ 核心特性

- 🔽 **一键下载** - 在GitHub仓库页面直接显示所有Release下载链接
- ⚡ **镜像加速** - 支持多种国内镜像站点，告别下载慢的烦恼
- � **自动重定向** - 当GitHub无法访问时自动跳转到镜像站
- �📊 **版本分组** - 智能按主版本号分组，轻松查找目标版本
- 🎨 **原生UI** - 使用HTML5 `<details>` 元素，完美融入GitHub界面
- ⚙️ **自定义镜像** - 支持添加自定义镜像规则，满足个性化需求
- 🌍 **多语言支持** - 支持中文、英文、日语界面


## 🚀 快速开始

### 安装方式

#### 方式一：从源码安装（推荐）
1. **克隆仓库**
   ```bash
   git clone https://github.com/JoyinJoester/GitHub-Enhanced-Downloader.git
   cd GitHub-Enhanced-Downloader
   ```

2. **加载扩展**
   - 打开Chrome浏览器，访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

3. **开始使用**
   - 访问任意GitHub仓库页面
   - 查看页面上新增的"🚀 下载发行版"按钮

#### 方式二：Chrome Web Store（即将上线）
即将在Chrome Web Store上架，敬请期待！

## 📖 使用指南

### 基础功能

1. **快速下载**
   - 访问GitHub仓库页面
   - 点击"🚀 下载发行版"按钮
   - 选择需要的版本和文件进行下载

2. **版本分组**
   - 自动按主版本号（1.x, 2.x等）分组显示
   - 支持折叠/展开查看，界面更整洁
   - 显示每个版本的发布时间和下载统计

### 高级功能

3. **自动重定向**
   - 当GitHub无法访问时自动跳转到镜像站
   - 支持选择首选镜像站点
   - 实时监控网络连接状态
   - 每5分钟自动检测GitHub可访问性

4. **镜像加速**
   - 点击扩展图标打开设置面板
   - 在"预设镜像"中选择合适的镜像站点
   - 支持的镜像站点：
     - 🌐 GitHub官方（原始链接）
     - 🚀 BGitHub（推荐）
     - ⚡ KKGitHub
     - 🔄 GitFun

5. **自定义镜像**
   - 在设置面板中添加自定义镜像规则
   - 支持的模板变量：
     - `${url}` - 完整的原始URL
     - `${domain}` - 域名部分
     - `${path}` - 路径部分
   - 示例：`https://your-mirror.com/${path}`

## 🛠️ 技术架构

### 项目结构
```
github-enhanced-downloader/
├── manifest.json           # 扩展配置文件
├── background.js          # 后台服务脚本
├── content.js            # 内容脚本
├── popup.html            # 设置页面HTML
├── popup.js              # 设置页面逻辑
├── _locales/             # 国际化语言包
│   ├── en/
│   ├── zh_CN/
│   └── ja/
└── README.md
```

### 技术栈
- **Manifest V3** - 最新的Chrome扩展API
- **Chrome APIs** - storage.sync, runtime.messaging
- **GitHub REST API** - 获取Release数据
- **原生JavaScript** - 无依赖，轻量高效
- **Chrome i18n** - 国际化支持

### 核心算法
- **版本解析**: 使用正则表达式 `/(?:v|V)?(\d+)/` 提取主版本号
- **镜像转换**: 支持模板字符串和JavaScript表达式两种规则
- **数据同步**: 基于chrome.storage.sync实现跨设备同步

## 🔧 故障排除

### 镜像下载链接不显示

如果您在下载发行版页面只看到GitHub官方下载按钮，而没有镜像站按钮：

1. **重新加载扩展**
   - 访问 `chrome://extensions/`
   - 找到扩展并点击"重新加载"

2. **重置配置**（在GitHub页面Console中运行）：
   ```javascript
   chrome.storage.sync.clear(() => {
     const defaultConfig = {
       mirrors: [
         { name: "KKGitHub", enabled: true, urlPattern: "${url}.replace(\"github.com\", \"kkgithub.com\")" },
         { name: "BGitHub", enabled: true, urlPattern: "${url}.replace(\"github.com\", \"bgithub.xyz\")" },
         { name: "GitFun", enabled: true, urlPattern: "${url}.replace(\"github.com\", \"github.ur1.fun\")" }
       ]
     };
     chrome.storage.sync.set({ mirrorConfig: defaultConfig }, () => alert('配置重置完成！请刷新页面。'));
   });
   ```

3. **刷新页面**并重新测试

详细修复指南请参考：[MIRROR_FIX_GUIDE.md](MIRROR_FIX_GUIDE.md)

### 扩展按钮显示"需要刷新"

这表示扩展已更新，请刷新页面即可恢复正常。

## 🔧 开发指南

### 环境要求
- Chrome 88+ (支持Manifest V3)
- 开发者模式权限

### 本地开发
1. **克隆并安装**
   ```bash
   git clone https://github.com/JoyinJoester/GitHub-Enhanced-Downloader.git
   cd GitHub-Enhanced-Downloader
   ```

2. **修改代码**
   - `content.js` - 页面注入逻辑
   - `background.js` - 数据处理逻辑
   - `popup.js` - 设置界面逻辑

3. **测试扩展**
   - 在 `chrome://extensions/` 中重新加载扩展
   - 访问GitHub仓库页面测试功能

### API接口
```javascript
// 获取仓库Release数据
const releases = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`);

// 镜像URL转换
function generateMirrorUrl(originalUrl, rule) {
    // 支持模板字符串和表达式两种方式
    if (rule.includes('${')) {
        return eval(`\`${rule}\``);
    } else {
        return eval(rule);
    }
}
```

## 🌐 国际化

支持多语言界面，当前已支持：
- 🇨🇳 **简体中文** (zh_CN)
- 🇺🇸 **English** (en) - 默认
- 🇯🇵 **日本語** (ja)

### 添加新语言
1. 在 `_locales/` 目录下创建语言文件夹（如 `fr` 表示法语）
2. 复制 `en/messages.json` 到新文件夹
3. 翻译所有消息文本
4. 扩展会自动检测并应用新语言

## 🤝 贡献指南

欢迎各种形式的贡献！

### 如何贡献
1. **Fork** 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 **Pull Request**

### 贡献类型
- 🐛 修复Bug
- ✨ 新增功能
- 📝 改进文档
- 🌍 添加语言支持
- 🎨 UI/UX改进
- ⚡ 性能优化

## 📋 更新日志

### [2.2.0] - 2024-12-08
#### 新增 ⚡
- 🔥 **智能下载调度器** - 全新的链式回退下载系统，自动选择最佳镜像站
- 🎯 **智能下载按钮** - 每个文件新增紫色"⚡ 智能下载"按钮，一键启动最优下载
- 🔄 **链式尝试机制** - 自动按优先级尝试：GitHub → KKGitHub → BGitHub → GitFun
- 🚨 **实时失效检测** - 智能检测镜像站失效页面，自动跳转到下一个可用镜像
- 📊 **下载状态通知** - 实时显示下载启动状态和结果反馈

#### 技术特性
- 🔍 **标签页监控** - 实时监控下载标签页状态，检测失效模式
- ⏱️ **智能超时** - 5秒成功判定，10秒强制超时，避免无限等待
- 🧹 **自动清理** - 自动关闭失效标签页，保持浏览器整洁
- 🛡️ **错误恢复** - 完善的异常处理和状态恢复机制

#### 用户体验
- 💜 **紫色智能按钮** - 显眼的智能下载入口，与传统链接区分
- 🎨 **状态指示** - 按钮颜色实时反映下载状态（等待/成功/失败）
- 📢 **友好通知** - 右上角滑动通知显示详细操作结果
- 🔄 **无缝体验** - 用户无感知的镜像切换和错误处理

### [2.1.4] - 2024-12-08
#### 修复 🔧
- 🔗 **镜像下载链接修复** - 修复下载页面只显示GitHub官方链接的问题
- 🛠️ **URL生成逻辑优化** - 改进镜像URL生成的模板字符串处理
- ⚙️ **默认配置更新** - 统一引号格式，提高兼容性
- 📋 **故障排除指南** - 添加详细的问题修复步骤和配置重置方法

#### 改进
- 🔍 **调试日志增强** - 增加详细的镜像URL生成日志
- 📖 **文档完善** - 新增故障排除部分和修复指南
- 🧪 **测试覆盖** - 添加完整的数据处理流程测试
- 🛡️ **容错机制** - 改进模板字符串执行失败时的回退逻辑

### [2.1.3] - 2024-12-08
#### 新增 🎯
- 🔄 **智能镜像故障转移系统** - 实时检测镜像站失效页面并自动切换
- 🚨 **多种失效模式检测** - 支持help.kkgithub.com、help子域名、/help路径等失效模式
- 📊 **优先级故障转移算法** - BGitHub → GitFun → KKGitHub智能切换顺序
- 🎯 **智能URL重构** - 保留原始GitHub路径，seamless用户体验
- 📢 **用户友好通知** - 故障转移时显示详细的切换信息

#### 改进
- 👂 **双重监控机制** - tabs.onUpdated和webNavigation.onBeforeNavigate同时监控
- 🔍 **详细故障转移日志** - 完整的故障转移过程记录和调试信息
- ⚡ **性能优化** - 高效的失效页面检测算法
- 🛡️ **异常处理增强** - 全面的错误捕获和恢复机制

### [2.1.2] - 2025-08-07
#### 修复
- 🔧 **自动重定向增强** - 修复GitHub无法访问时不自动跳转镜像站的问题
- ⏱️ **网络检测优化** - 将超时时间从3秒增加到8秒，提高检测准确性
- 🎯 **智能镜像选择** - 使用用户配置的首选镜像站进行重定向
- 📢 **用户体验改进** - 重定向时显示友好的通知提示

#### 改进
- 👂 **监听器增强** - 添加webNavigation.onBeforeNavigate补充监听
- 🔍 **日志优化** - 降低扩展上下文监控的日志级别，减少控制台噪音
- ✅ **状态检查** - 增强HTTP响应状态验证，提高网络检测可靠性

### [2.1.1] - 2025-08-07
#### 修复
- 🔧 **镜像URL生成修复** - 修复镜像下载链接显示为JavaScript代码的问题
- 🛡️ **扩展上下文保护** - 增强扩展重载时的错误处理机制
- 🔄 **正则回退机制** - 添加JavaScript表达式执行失败时的安全回退
- 📱 **用户体验改进** - 扩展失效时显示友好的刷新提示

#### 改进
- ⚡ **URL处理优化** - 增强模板字符串和JavaScript表达式的处理逻辑
- 🧪 **测试覆盖** - 添加全面的镜像URL生成测试用例
- 🛠️ **错误处理** - 改进所有Chrome API调用的错误捕获机制

### [2.1.0] - 2024-08-07
#### 新增
- 🔄 **自动重定向功能** - 当GitHub无法访问时自动跳转到镜像站
- ⏰ **网络状态监控** - 每5分钟自动检测GitHub可访问性
- ⚙️ **重定向设置** - 可选择首选镜像站和开关自动重定向
- 🔗 **多站点支持** - 扩展现在可在所有镜像站上运行

#### 改进
- 📈 **权限优化** - 添加tabs、alarms、webNavigation权限
- 🌐 **多域名支持** - content_scripts和host_permissions支持所有镜像域名
- 🔧 **后台增强** - 升级为ES6模块，支持导航拦截

### [2.0.0] - 2024-08-06
#### 新增
- ✨ 版本智能分组功能
- 🌍 多语言支持（中/英/日）
- ⚙️ 自定义镜像配置
- 🎨 原生HTML5折叠界面
- 💾 设置云端同步

#### 改进
- ⚡ 优化加载速度
- 🔧 重构代码架构
- 📱 改进移动端适配

### [1.0.0] - 2024-07-01
#### 新增
- 🚀 基础下载功能
- ⚡ 预设镜像支持
- 🎨 GitHub原生界面集成

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

```
MIT License

Copyright (c) 2024 GitHub Enhanced Downloader

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## 🙏 致谢

- [GitHub API](https://docs.github.com/en/rest) - 提供数据接口
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - 扩展开发平台
- [各大镜像站点](https://github.com) - 提供加速服务
- [开源社区](https://github.com) - 提供技术支持

## 📞 联系方式

- 📧 Email: joyinjoester@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader/discussions)

---

### ⭐ 如果这个项目对您有帮助，请给个Star支持一下！

---

## English

A powerful Chrome extension that adds quick download buttons to GitHub repository pages with mirror acceleration and intelligent version grouping.

### Features
- 🔽 One-click downloads from GitHub repository pages
- ⚡ Mirror acceleration for faster downloads
- 📊 Smart version grouping by major version numbers
- 🎨 Native UI integration with GitHub
- ⚙️ Custom mirror configuration
- 🌍 Multi-language support (English/Chinese/Japanese)

### Installation
1. Clone this repository
2. Open Chrome Extensions page (`chrome://extensions/`)
3. Enable Developer mode
4. Click "Load unpacked" and select the project folder

---

## 日本語

GitHubリポジトリページにクイックダウンロードボタンを追加し、ミラー加速とバージョングループ化機能を提供する強力なChrome拡張機能です。

### 機能
- 🔽 GitHubリポジトリページからワンクリックダウンロード
- ⚡ 高速ダウンロードのためのミラー加速
- 📊 メジャーバージョン番号による賢いバージョングループ化
- 🎨 GitHubとのネイティブUI統合
- ⚙️ カスタムミラー設定
- 🌍 多言語サポート（英語/中国語/日本語）

### インストール
1. このリポジトリをクローン
2. Chrome拡張機能ページを開く (`chrome://extensions/`)
3. デベロッパーモードを有効にする
4. "パッケージ化されていない拡張機能を読み込む"をクリックしてプロジェクトフォルダを選択
