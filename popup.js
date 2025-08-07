/**
 * GitHub Enhanced Downloader - Popup Script
 * 实现弹窗界面的交互逻辑
 */

class PopupManager {
  constructor() {
    this.elements = {};
    this.isLoading = false;
    this.init();
  }

  /**
   * 初始化管理器
   */
  init() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindEvents());
    } else {
      this.bindEvents();
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 获取DOM元素
    this.elements = {
      // 主视图元素
      mainView: document.getElementById('main-view'),
      settingsView: document.getElementById('settings-view'),
      repoInput: document.getElementById('repo-input'),
      analyzeBtn: document.getElementById('analyze-btn'),
      resultsContainer: document.getElementById('results-container'),
      
      // 按钮元素
      settingsBtn: document.getElementById('settings-btn'),
      backBtn: document.getElementById('back-btn'),
      saveSettingsBtn: document.getElementById('save-settings-btn')
    };

    // 绑定事件
    this.elements.analyzeBtn.addEventListener('click', () => this.handleAnalyze());
    this.elements.settingsBtn.addEventListener('click', () => this.showSettingsView());
    this.elements.backBtn.addEventListener('click', () => this.showMainView());
    this.elements.saveSettingsBtn.addEventListener('click', () => this.handleSaveSettings());
    
    // 回车键触发分析
    this.elements.repoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isLoading) {
        this.handleAnalyze();
      }
    });

    console.log('PopupManager 初始化完成');
  }

  /**
   * 显示主视图
   */
  showMainView() {
    this.elements.mainView.classList.remove('hidden');
    this.elements.settingsView.classList.add('hidden');
    this.elements.settingsView.style.display = 'none';
    this.elements.mainView.style.display = 'block';
  }

  /**
   * 显示设置视图
   */
  async showSettingsView() {
    this.elements.mainView.classList.add('hidden');
    this.elements.settingsView.classList.remove('hidden');
    this.elements.mainView.style.display = 'none';
    this.elements.settingsView.style.display = 'block';
    
    // 加载并渲染当前配置
    await this.loadAndRenderSettings();
  }

  /**
   * 处理分析按钮点击
   */
  async handleAnalyze() {
    if (this.isLoading) return;

    const repoInput = this.elements.repoInput.value.trim();
    if (!repoInput) {
      this.showError('请输入 GitHub 仓库地址');
      return;
    }

    // 解析仓库信息
    const repoInfo = this.parseRepoInput(repoInput);
    if (!repoInfo) {
      this.showError('仓库地址格式不正确，请使用 owner/repo 格式');
      return;
    }

    this.setLoading(true);
    this.showLoading();

    try {
      // 向 background.js 发送消息
      const response = await this.sendMessage({
        type: 'FETCH_RELEASES',
        owner: repoInfo.owner,
        repo: repoInfo.repo
      });

      if (response.success) {
        this.renderResults(response);
      } else {
        this.showError(response.error || '获取发行版信息失败');
      }
    } catch (error) {
      console.error('分析失败:', error);
      this.showError('分析过程中发生错误: ' + error.message);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 解析仓库输入
   */
  parseRepoInput(input) {
    // 清理输入
    input = input.trim();
    
    // 支持的格式:
    // 1. owner/repo
    // 2. https://github.com/owner/repo
    // 3. github.com/owner/repo
    
    let match;
    
    // 完整URL格式
    match = input.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\s]+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '') // 移除.git后缀
      };
    }
    
    // 简单格式 owner/repo
    match = input.match(/^([^\/\s]+)\/([^\/\s]+)$/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
    
    return null;
  }

  /**
   * 发送消息给 background.js
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * 设置加载状态
   */
  setLoading(loading) {
    this.isLoading = loading;
    this.elements.analyzeBtn.disabled = loading;
    this.elements.analyzeBtn.textContent = loading ? '分析中...' : '开始分析';
  }

  /**
   * 显示加载中状态
   */
  showLoading() {
    this.elements.resultsContainer.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        正在分析仓库发行版...
      </div>
    `;
  }

  /**
   * 显示错误信息
   */
  showError(message) {
    this.elements.resultsContainer.innerHTML = `
      <div class="error-state">
        <div class="error-icon">❌</div>
        <div>${message}</div>
      </div>
    `;
  }

  /**
   * 渲染分析结果
   */
  renderResults(response) {
    const { data, totalCount, groupCount, source } = response;
    
    if (!data || data.length === 0) {
      this.elements.resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div>该仓库没有发行版</div>
        </div>
      `;
      return;
    }

    // 创建结果摘要
    let html = `
      <div class="result-summary">
        <div class="result-title">
          📊 分析结果
        </div>
        <div class="result-stats">
          总计 ${totalCount} 个发行版，分为 ${groupCount} 个版本组<br>
          数据来源: ${source}
        </div>
        <button class="open-modal-btn" onclick="popupManager.openDownloadModal(${JSON.stringify(data).replace(/"/g, '&quot;')})">
          打开下载界面
        </button>
      </div>
    `;

    // 创建版本组列表（前3个）
    const maxGroups = Math.min(3, data.length);
    for (let i = 0; i < maxGroups; i++) {
      const group = data[i];
      const versionName = group.version || `版本组 ${i + 1}`;
      const releaseCount = group.releases.length;
      
      html += `
        <details class="version-group" ${i === 0 ? 'open' : ''}>
          <summary class="version-summary">
            <span class="version-name">${versionName}</span>
            <span class="release-count">${releaseCount} 个发行版</span>
          </summary>
          <div class="releases-list">
      `;
      
      // 显示该组的前3个发行版
      const maxReleases = Math.min(3, group.releases.length);
      for (let j = 0; j < maxReleases; j++) {
        const release = group.releases[j];
        html += `
          <div class="release-item">
            <div class="release-name">${release.tag_name}</div>
            <div class="release-date">${new Date(release.published_at).toLocaleDateString('zh-CN')}</div>
            <div class="asset-count">${release.assets.length} 个文件</div>
          </div>
        `;
      }
      
      if (group.releases.length > 3) {
        html += `<div class="more-releases">还有 ${group.releases.length - 3} 个发行版...</div>`;
      }
      
      html += '</div></details>';
    }

    if (data.length > 3) {
      html += `<div class="more-groups">还有 ${data.length - 3} 个版本组...</div>`;
    }

    // 添加样式
    html += `
      <style>
        .version-group {
          border: 1px solid #d0d7de;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        
        .version-summary {
          padding: 12px 16px;
          background-color: #f6f8fa;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 500;
        }
        
        .version-summary:hover {
          background-color: #f1f3f4;
        }
        
        .version-name {
          color: #24292f;
        }
        
        .release-count {
          color: #656d76;
          font-size: 13px;
        }
        
        .releases-list {
          padding: 12px 16px;
          background-color: #ffffff;
        }
        
        .release-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f1f3f4;
          font-size: 13px;
        }
        
        .release-item:last-child {
          border-bottom: none;
        }
        
        .release-name {
          font-weight: 500;
          color: #24292f;
        }
        
        .release-date {
          color: #656d76;
        }
        
        .asset-count {
          color: #0969da;
          font-size: 12px;
        }
        
        .more-releases, .more-groups {
          text-align: center;
          color: #656d76;
          font-style: italic;
          padding: 8px;
          font-size: 13px;
        }
      </style>
    `;

    this.elements.resultsContainer.innerHTML = html;
  }

  /**
   * 打开下载模态框
   */
  openDownloadModal(data) {
    // 注入内容脚本到当前标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }, () => {
          // 发送数据到内容脚本
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'SHOW_DOWNLOAD_MODAL',
            data: data
          });
        });
      }
    });
  }

  /**
   * 加载并渲染设置界面
   */
  async loadAndRenderSettings() {
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['mirrorConfig'], resolve);
      });

      let config = result.mirrorConfig;
      
      // 如果没有配置，使用默认配置
      if (!config) {
        config = this.getDefaultMirrorConfig();
      }

      // 渲染自动重定向设置
      this.renderAutoRedirectSetting(config);
      
      // 渲染镜像列表
      this.renderMirrorsList(config);
      
      // 绑定添加镜像按钮事件
      document.getElementById('add-mirror-btn').addEventListener('click', () => {
        this.addCustomMirror();
      });

    } catch (error) {
      console.error('加载设置失败:', error);
      this.showSettingsError('加载设置时发生错误');
    }
  }

  /**
   * 获取默认镜像配置
   */
  getDefaultMirrorConfig() {
    return {
      enableMirrors: true,
      autoRedirect: {
        enabled: false,
        preferredMirror: "KKGitHub"
      },
      mirrorRules: [
        {
          name: "KKGitHub",
          downloadUrl: "https://kkgithub.com/{owner}/{repo}/releases/download/{tag}/{filename}",
          enabled: true,
          priority: 1,
          isCustom: false
        },
        {
          name: "BGitHub", 
          downloadUrl: "https://bgithub.xyz/{owner}/{repo}/releases/download/{tag}/{filename}",
          enabled: true,
          priority: 2,
          isCustom: false
        },
        {
          name: "GitFun",
          downloadUrl: "https://github.ur1.fun/{owner}/{repo}/releases/download/{tag}/{filename}",
          enabled: true,
          priority: 3,
          isCustom: false
        }
      ]
    };
  }

  /**
   * 渲染自动重定向设置
   */
  renderAutoRedirectSetting(config) {
    const autoRedirectCheckbox = document.getElementById('auto-redirect-enabled');
    autoRedirectCheckbox.checked = config.autoRedirect && config.autoRedirect.enabled;
  }

  /**
   * 渲染镜像列表
   */
  renderMirrorsList(config) {
    const mirrorsList = document.getElementById('mirrors-list');
    mirrorsList.innerHTML = '';

    config.mirrorRules.forEach((mirror, index) => {
      const mirrorItem = this.createMirrorItem(mirror, index);
      mirrorsList.appendChild(mirrorItem);
    });
  }

  /**
   * 创建镜像项目元素
   */
  createMirrorItem(mirror, index) {
    const item = document.createElement('div');
    item.className = `mirror-item ${mirror.isCustom ? 'custom-mirror' : ''}`;
    item.dataset.index = index;

    item.innerHTML = `
      <div class="mirror-header">
        <div class="mirror-name">
          ${mirror.isCustom ? '🔧' : '🌐'} ${mirror.name}
        </div>
        <div class="mirror-controls">
          <input type="checkbox" class="mirror-enabled" ${mirror.enabled ? 'checked' : ''}>
          ${mirror.isCustom ? '<button class="delete-btn" title="删除">🗑️</button>' : ''}
        </div>
      </div>
      <input type="text" class="mirror-url" value="${mirror.downloadUrl}" ${mirror.isCustom ? '' : 'readonly'} placeholder="镜像 URL 模板">
    `;

    // 绑定事件
    const enabledCheckbox = item.querySelector('.mirror-enabled');
    enabledCheckbox.addEventListener('change', () => {
      mirror.enabled = enabledCheckbox.checked;
    });

    const urlInput = item.querySelector('.mirror-url');
    if (mirror.isCustom) {
      urlInput.addEventListener('input', () => {
        mirror.downloadUrl = urlInput.value;
      });
    }

    const deleteBtn = item.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deleteMirror(index);
      });
    }

    return item;
  }

  /**
   * 添加自定义镜像
   */
  addCustomMirror() {
    const config = this.getCurrentConfig();
    
    const newMirror = {
      name: `自定义镜像 ${config.mirrorRules.filter(m => m.isCustom).length + 1}`,
      downloadUrl: "https://your-mirror.com/{owner}/{repo}/releases/download/{tag}/{filename}",
      enabled: true,
      priority: config.mirrorRules.length + 1,
      isCustom: true
    };

    config.mirrorRules.push(newMirror);
    this.renderMirrorsList(config);
  }

  /**
   * 删除镜像
   */
  deleteMirror(index) {
    if (confirm('确定要删除这个镜像吗？')) {
      const config = this.getCurrentConfig();
      config.mirrorRules.splice(index, 1);
      this.renderMirrorsList(config);
    }
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig() {
    const config = {
      enableMirrors: true,
      autoRedirect: {
        enabled: document.getElementById('auto-redirect-enabled').checked,
        preferredMirror: "KKGitHub"
      },
      mirrorRules: []
    };

    // 从界面收集镜像配置
    const mirrorItems = document.querySelectorAll('.mirror-item');
    mirrorItems.forEach((item, index) => {
      const nameElement = item.querySelector('.mirror-name');
      const enabledCheckbox = item.querySelector('.mirror-enabled');
      const urlInput = item.querySelector('.mirror-url');
      const isCustom = item.classList.contains('custom-mirror');

      // 提取镜像名称（去掉表情符号）
      const name = nameElement.textContent.replace(/^[🌐🔧]\s*/, '');

      config.mirrorRules.push({
        name: name,
        downloadUrl: urlInput.value,
        enabled: enabledCheckbox.checked,
        priority: index + 1,
        isCustom: isCustom
      });
    });

    return config;
  }

  /**
   * 保存设置
   */
  async handleSaveSettings() {
    try {
      const config = this.getCurrentConfig();
      
      // 验证配置
      if (!this.validateConfig(config)) {
        return;
      }

      // 保存到 chrome.storage.local
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ mirrorConfig: config }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      // 同时通知 background.js 更新配置
      await this.sendMessage({
        type: 'updateMirrorConfig',
        config: config
      });

      this.showSettingsSuccess('设置保存成功！');
      
      // 1.5秒后返回主视图
      setTimeout(() => {
        this.showMainView();
      }, 1500);

    } catch (error) {
      console.error('保存设置失败:', error);
      this.showSettingsError('保存失败: ' + error.message);
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    // 检查是否至少有一个启用的镜像
    const enabledMirrors = config.mirrorRules.filter(m => m.enabled);
    if (enabledMirrors.length === 0) {
      this.showSettingsError('至少需要启用一个镜像站点');
      return false;
    }

    // 检查自定义镜像URL格式
    for (const mirror of config.mirrorRules) {
      if (mirror.isCustom && mirror.enabled) {
        if (!mirror.downloadUrl || !mirror.downloadUrl.includes('{owner}') || !mirror.downloadUrl.includes('{repo}')) {
          this.showSettingsError(`自定义镜像 "${mirror.name}" 的URL格式不正确，必须包含 {owner} 和 {repo} 占位符`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 显示设置成功消息
   */
  showSettingsSuccess(message) {
    // 移除已存在的消息
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // 创建成功消息
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
      <span>✅</span>
      <span>${message}</span>
    `;

    // 插入到保存按钮前
    this.elements.saveSettingsBtn.parentNode.insertBefore(successDiv, this.elements.saveSettingsBtn);
  }

  /**
   * 显示设置错误消息
   */
  showSettingsError(message) {
    // 移除已存在的消息
    const existingMessage = document.querySelector('.error-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // 创建错误消息
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    errorDiv.style.marginBottom = '16px';
    errorDiv.innerHTML = `
      <div class="error-icon">❌</div>
      <div>${message}</div>
    `;

    // 插入到保存按钮前
    this.elements.saveSettingsBtn.parentNode.insertBefore(errorDiv, this.elements.saveSettingsBtn);

    // 3秒后自动移除
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 3000);
  }
}

// 创建全局实例
let popupManager;

// 确保在DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    popupManager = new PopupManager();
  });
} else {
  popupManager = new PopupManager();
}
