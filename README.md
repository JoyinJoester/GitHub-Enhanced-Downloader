# 🚀 GitHub Enhanced Downloader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0.0-green.svg)](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader)
[![GitHub stars](https://img.shields.io/github/stars/JoyinJoester/GitHub-Enhanced-Downloader.svg)](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/JoyinJoester/GitHub-Enhanced-Downloader.svg)](https://github.com/JoyinJoester/GitHub-Enhanced-Downloader/issues)

> 🌟 一个强大的Chrome扩展，为GitHub仓库页面添加快速下载按钮，支持镜像加速和智能版本分组

[English](#english) | [中文说明](#中文说明) | [日本語](#日本語)

## ✨ 核心特性

- 🔽 **一键下载** - 在GitHub仓库页面直接显示所有Release下载链接
- ⚡ **镜像加速** - 支持多种国内镜像站点，告别下载慢的烦恼
- 📊 **版本分组** - 智能按主版本号分组，轻松查找目标版本
- 🎨 **原生UI** - 使用HTML5 `<details>` 元素，完美融入GitHub界面
- ⚙️ **自定义镜像** - 支持添加自定义镜像规则，满足个性化需求
- 🌍 **多语言支持** - 支持中文、英文、日语界面
- 💾 **云端同步** - 设置自动同步到Chrome账户

## 📸 预览截图

### 主界面展示
![主界面](https://via.placeholder.com/800x500/2188ff/ffffff?text=GitHub+Enhanced+Downloader+Main+Interface)

### 版本分组功能
![版本分组](https://via.placeholder.com/800x400/28a745/ffffff?text=Version+Grouping+Feature)

### 镜像设置页面
![镜像设置](https://via.placeholder.com/600x400/17a2b8/ffffff?text=Mirror+Settings+Panel)

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

3. **镜像加速**
   - 点击扩展图标打开设置面板
   - 在"预设镜像"中选择合适的镜像站点
   - 支持的镜像站点：
     - 🌐 GitHub官方（原始链接）
     - 🚀 GHProxy（推荐）
     - ⚡ KKGitHub
     - 🔄 FastGit
     - 📦 JSDelivr

4. **自定义镜像**
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
