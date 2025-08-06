// GitHub Enhanced Downloader - Content Script

// 全局变量
let isButtonAdded = false;
let currentModal = null;

// 1. 注入按钮到页面
function injectDownloadButton() {
  // 检查是否已添加按钮
  if (isButtonAdded || document.getElementById('enhanced-downloader-btn')) {
    return;
  }

  console.log('GitHub Enhanced Downloader: 开始注入下载按钮');

  // 查找合适的插入位置
  const targetSelectors = [
    '.file-navigation .flash-full',
    '.file-navigation',
    '.pagehead-actions',
    '.UnderlineNav-body',
    '.BorderGrid-cell'
  ];

  let insertTarget = null;
  for (const selector of targetSelectors) {
    insertTarget = document.querySelector(selector);
    if (insertTarget) {
      console.log(`GitHub Enhanced Downloader: 找到插入点: ${selector}`);
      break;
    }
  }

  if (!insertTarget) {
    console.log('GitHub Enhanced Downloader: 未找到合适的插入位置');
    return;
  }

  // 创建下载按钮
  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'enhanced-downloader-btn';
  downloadBtn.textContent = '🚀 ' + chrome.i18n.getMessage('downloadReleases');
  downloadBtn.className = 'btn btn-sm';
  
  // 添加按钮样式
  downloadBtn.style.cssText = `
    display: inline-flex;
    align-items: center;
    padding: 6px 16px;
    margin: 8px;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    white-space: nowrap;
    vertical-align: middle;
    cursor: pointer;
    user-select: none;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    appearance: none;
    color: #24292f;
    background-color: #f6f8fa;
    text-decoration: none;
    transition: all 0.2s ease;
  `;

  // 添加悬停效果
  downloadBtn.addEventListener('mouseenter', () => {
    downloadBtn.style.backgroundColor = '#f3f4f6';
    downloadBtn.style.borderColor = '#d0d7de';
  });

  downloadBtn.addEventListener('mouseleave', () => {
    downloadBtn.style.backgroundColor = '#f6f8fa';
    downloadBtn.style.borderColor = '#d0d7de';
  });

  // 2. 添加点击事件
  downloadBtn.addEventListener('click', handleDownloadClick);

  // 插入按钮
  insertTarget.appendChild(downloadBtn);
  isButtonAdded = true;
  console.log('GitHub Enhanced Downloader: 下载按钮已添加');
}

// 2. 处理按钮点击事件
async function handleDownloadClick(event) {
  event.preventDefault();
  
  const button = event.target;
  const originalText = button.textContent;

  try {
    // a. 显示加载状态
    button.textContent = '⏳ ' + chrome.i18n.getMessage('loading');
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';

    // b. 解析仓库信息
    const repoInfo = extractRepoInfo();
    if (!repoInfo) {
      throw new Error('无法从URL中提取仓库信息');
    }

    console.log('GitHub Enhanced Downloader: 提取到仓库信息', repoInfo);

    // c. 发送消息给background script
    chrome.runtime.sendMessage({
      type: 'FETCH_RELEASES',
      owner: repoInfo.owner,
      repo: repoInfo.repo
    }, (response) => {
      // 恢复按钮状态
      button.textContent = originalText;
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';

      // 3. 处理响应数据
      if (chrome.runtime.lastError) {
        console.error('GitHub Enhanced Downloader: 消息发送失败', chrome.runtime.lastError);
        showErrorModal('连接后台脚本失败，请重新加载页面');
        return;
      }

      if (response.success) {
        console.log('GitHub Enhanced Downloader: 成功获取到分组releases数据', response);
        showReleasesModal(response.data, repoInfo, response.totalCount, response.groupCount);
      } else {
        console.error('GitHub Enhanced Downloader: 获取releases失败', response.error);
        showErrorModal(response.error);
      }
    });

  } catch (error) {
    // 恢复按钮状态
    button.textContent = originalText;
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
    
    console.error('GitHub Enhanced Downloader: 处理点击事件时发生错误', error);
    showErrorModal(error.message);
  }
}

// 从URL提取仓库信息
function extractRepoInfo() {
  const pathname = window.location.pathname;
  const parts = pathname.split('/').filter(part => part.length > 0);
  
  if (parts.length >= 2) {
    return {
      owner: parts[0],
      repo: parts[1]
    };
  }
  
  return null;
}

// 3. 创建和显示模态框
function showReleasesModal(groupedReleases, repoInfo, totalCount, groupCount) {
  // 移除已存在的模态框
  removeModal();

  console.log('GitHub Enhanced Downloader: 创建分组releases模态框');

  // 创建模态框容器
  const overlay = createModalOverlay();
  const modal = createModalContainer();
  
  // 创建模态框内容
  const content = createModalContent(groupedReleases, repoInfo, totalCount, groupCount);
  modal.appendChild(content);
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  currentModal = overlay;

  // 添加关闭事件
  setupModalCloseEvents(overlay, modal);
}

// 显示错误模态框
function showErrorModal(errorMessage) {
  removeModal();

  const overlay = createModalOverlay();
  const modal = createModalContainer();
  
  modal.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <div style="color: #d73a49; font-size: 18px; margin-bottom: 16px;">
        ❌ 获取发行版信息失败
      </div>
      <div style="color: #586069; margin-bottom: 20px;">
        ${errorMessage}
      </div>
      <button id="error-modal-close" style="
        background-color: #d73a49;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
      ">关闭</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  currentModal = overlay;

  // 添加关闭事件
  setupModalCloseEvents(overlay, modal);
  document.getElementById('error-modal-close').addEventListener('click', removeModal);
}

// 创建模态框覆盖层
function createModalOverlay() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(2px);
  `;
  return overlay;
}

// 创建模态框容器
function createModalContainer() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    margin: 20px;
    animation: modalFadeIn 0.3s ease;
  `;

  // 添加动画样式
  if (!document.getElementById('modal-animations')) {
    const style = document.createElement('style');
    style.id = 'modal-animations';
    style.textContent = `
      @keyframes modalFadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      
      /* 隐藏原生的details箭头 */
      details > summary {
        list-style: none;
      }
      details > summary::-webkit-details-marker {
        display: none;
      }
      details > summary::marker {
        display: none;
      }
      
      /* details展开动画 */
      details[open] > div {
        animation: detailsOpen 0.3s ease;
      }
      
      @keyframes detailsOpen {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  return modal;
}

// 创建模态框内容
function createModalContent(groupedReleases, repoInfo, totalCount, groupCount) {
  const content = document.createElement('div');
  
  // 创建头部
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 20px 20px 0 20px;
    border-bottom: 1px solid #e1e4e8;
    position: sticky;
    top: 0;
    background-color: white;
    z-index: 1;
  `;
  
  header.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2 style="margin: 0; color: #24292f; font-size: 20px;">
        📦 ${repoInfo.owner}/${repoInfo.repo} - 发行版下载
      </h2>
      <button id="modal-close-btn" style="
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #656d76;
        padding: 4px;
        border-radius: 4px;
      ">×</button>
    </div>
    <div style="color: #656d76; font-size: 14px; margin-bottom: 16px;">
      找到 ${groupCount} 个版本组，共 ${totalCount} 个发行版
    </div>
  `;

  // 创建发行版列表
  const releasesList = document.createElement('div');
  releasesList.style.cssText = `
    padding: 0 20px 20px 20px;
    max-height: 60vh;
    overflow-y: auto;
  `;

  if (groupedReleases.length === 0) {
    releasesList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #656d76;">
        <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
        <div>${chrome.i18n.getMessage('noReleases')}</div>
      </div>
    `;
  } else {
    // 2. 使用可折叠组件 - 遍历分组数组
    groupedReleases.forEach((group, groupIndex) => {
      const groupElement = createVersionGroupWithDetails(group, groupIndex);
      releasesList.appendChild(groupElement);
    });
  }

  content.appendChild(header);
  content.appendChild(releasesList);
  
  return content;
}

// 2. 使用 <details> 元素创建版本组
function createVersionGroupWithDetails(group, groupIndex) {
  // c. 创建 <details> HTML 元素
  const detailsElement = document.createElement('details');
  
  // e. 默认将第一个 <details> 元素设置为打开状态
  if (groupIndex === 0) {
    detailsElement.open = true;
  }
  
  // 4.b 为 <details> 元素之间添加间距
  detailsElement.style.cssText = `
    margin-bottom: 20px;
    border: 2px solid #e1e4e8;
    border-radius: 8px;
    background-color: white;
    overflow: hidden;
  `;

  // d. 创建 <summary> 元素作为可点击的折叠标题
  const summaryElement = document.createElement('summary');
  
  const isLatest = groupIndex === 0;
  const groupDisplayName = group.groupName === 'Other' ? 
    chrome.i18n.getMessage('versionGroup', ['Other']) : 
    chrome.i18n.getMessage('versionGroup', [group.groupName]);
  
  summaryElement.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
      <div style="display: flex; align-items: center;">
        ${isLatest ? '🌟 ' : '📋 '}
        <span style="font-weight: bold; color: ${isLatest ? '#0969da' : '#24292f'};">
          ${groupDisplayName}
        </span>
        ${isLatest ? '<span style="background-color: #1f883d; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 12px;">最新</span>' : ''}
      </div>
      <span style="color: #656d76; font-size: 14px; margin-right: 8px;">
        ${group.releases.length} 个版本
      </span>
    </div>
  `;
  
  // 4.a 为 <summary> 元素添加样式
  summaryElement.style.cssText = `
    padding: 16px 20px;
    background-color: ${isLatest ? '#e6f3ff' : '#f6f8fa'};
    cursor: pointer;
    list-style: none;
    user-select: none;
    font-size: 18px;
    font-weight: 500;
    border-bottom: 2px solid #e1e4e8;
    transition: background-color 0.2s ease;
  `;

  // 移除默认的展开箭头
  summaryElement.style.listStyle = 'none';
  summaryElement.style.outline = 'none';
  
  // 添加自定义箭头
  summaryElement.addEventListener('click', function(e) {
    // 延迟执行以确保details状态已更新
    setTimeout(() => {
      const isOpen = detailsElement.open;
      const arrow = summaryElement.querySelector('.custom-arrow');
      if (arrow) {
        arrow.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
      }
    }, 0);
  });

  // 添加自定义箭头
  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'custom-arrow';
  arrowSpan.innerHTML = '▶';
  arrowSpan.style.cssText = `
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%) ${groupIndex === 0 ? 'rotate(90deg)' : 'rotate(0deg)'};
    transition: transform 0.2s ease;
    color: #656d76;
    font-size: 12px;
  `;
  
  summaryElement.style.position = 'relative';
  summaryElement.appendChild(arrowSpan);

  // 悬停效果
  summaryElement.addEventListener('mouseenter', () => {
    summaryElement.style.backgroundColor = isLatest ? '#d4e6ff' : '#eaeef2';
  });
  
  summaryElement.addEventListener('mouseleave', () => {
    summaryElement.style.backgroundColor = isLatest ? '#e6f3ff' : '#f6f8fa';
  });

  // 创建内容容器
  const contentContainer = document.createElement('div');
  contentContainer.style.cssText = `
    padding: 16px;
    background-color: white;
  `;

  // 3. 渲染内部列表 - 遍历该组的 releases 数组
  group.releases.forEach((release, releaseIndex) => {
    const releaseElement = createReleaseElementForGroup(release, releaseIndex);
    contentContainer.appendChild(releaseElement);
  });

  // 组装 details 元素
  detailsElement.appendChild(summaryElement);
  detailsElement.appendChild(contentContainer);
  
  return detailsElement;
}

// 3.b 为分组内的release创建元素（复用之前的渲染逻辑）
function createReleaseElementForGroup(release, index) {
  const releaseDiv = document.createElement('div');
  releaseDiv.style.cssText = `
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    margin-bottom: 16px;
    background-color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  `;

  const releaseHeader = document.createElement('div');
  releaseHeader.style.cssText = `
    padding: 16px;
    border-bottom: 1px solid #e1e4e8;
    background-color: #fafbfc;
  `;

  const publishedDate = new Date(release.published_at).toLocaleDateString('zh-CN');
  
  releaseHeader.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <h4 style="margin: 0; color: #24292f; font-size: 16px;">
        ${release.name}
        ${release.prerelease ? '<span style="background-color: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 8px;">预发布</span>' : ''}
      </h4>
      <span style="color: #656d76; font-size: 14px;">${publishedDate}</span>
    </div>
    <div style="color: #656d76; font-size: 14px;">
      <code style="background-color: #f6f8fa; padding: 2px 6px; border-radius: 3px;">${release.tag_name}</code>
    </div>
  `;

  const assetsContainer = document.createElement('div');
  assetsContainer.style.cssText = `padding: 16px;`;

  if (release.assets.length === 0) {
    assetsContainer.innerHTML = `
      <div style="color: #656d76; text-align: center; padding: 20px;">
        📄 此发行版没有附件文件
      </div>
    `;
  } else {
    assetsContainer.innerHTML = `
      <h5 style="margin: 0 0 12px 0; color: #24292f; font-size: 14px; font-weight: 600;">
        📁 下载文件 (${release.assets.length} 个)
      </h5>
    `;

    release.assets.forEach(asset => {
      const assetElement = createAssetElement(asset);
      assetsContainer.appendChild(assetElement);
    });
  }

  releaseDiv.appendChild(releaseHeader);
  releaseDiv.appendChild(assetsContainer);
  
  return releaseDiv;
}

// 创建单个资源文件元素
function createAssetElement(asset) {
  const assetDiv = document.createElement('div');
  assetDiv.style.cssText = `
    border: 1px solid #e1e4e8;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 8px;
    background-color: white;
  `;

  const fileSize = formatFileSize(asset.size);
  
  assetDiv.innerHTML = `
    <div style="margin-bottom: 8px;">
      <span style="font-weight: 500; color: #24292f;">${asset.name}</span>
      <span style="color: #656d76; margin-left: 8px;">(${fileSize})</span>
      ${asset.download_count ? `<span style="color: #656d76; margin-left: 8px;">↓ ${asset.download_count}</span>` : ''}
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      ${asset.download_links.map(link => `
        <a href="${link.url}" 
           target="_blank" 
           style="
             display: inline-flex;
             align-items: center;
             padding: 4px 8px;
             background-color: ${link.type === 'official' ? '#2da44e' : '#0969da'};
             color: white;
             text-decoration: none;
             border-radius: 4px;
             font-size: 12px;
             font-weight: 500;
             transition: all 0.2s ease;
           "
           onmouseover="this.style.opacity='0.8'"
           onmouseout="this.style.opacity='1'">
          ${link.type === 'official' ? '🏠' : '🚀'} ${link.name}
        </a>
      `).join('')}
    </div>
  `;

  return assetDiv;
}

// 设置模态框关闭事件
function setupModalCloseEvents(overlay, modal) {
  // 点击关闭按钮
  const closeBtn = modal.querySelector('#modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', removeModal);
  }

  // 点击背景关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      removeModal();
    }
  });

  // ESC键关闭
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      removeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

// 移除模态框
function removeModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
    console.log('GitHub Enhanced Downloader: 模态框已关闭');
  }
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 检查是否为GitHub仓库页面
function isGitHubRepoPage() {
  return window.location.hostname === 'github.com' && 
         window.location.pathname.split('/').filter(Boolean).length >= 2;
}

// 初始化脚本
function init() {
  console.log('GitHub Enhanced Downloader: Content Script 已加载');
  
  if (!isGitHubRepoPage()) {
    console.log('GitHub Enhanced Downloader: 不是GitHub仓库页面，跳过');
    return;
  }

  // 等待页面加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(injectDownloadButton, 1000);
    });
  } else {
    setTimeout(injectDownloadButton, 1000);
  }

  // 监听页面变化（GitHub是SPA）
  observePageChanges();
}

// 监听页面变化
function observePageChanges() {
  let currentUrl = window.location.href;
  
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      isButtonAdded = false;
      
      setTimeout(() => {
        if (isGitHubRepoPage()) {
          injectDownloadButton();
        }
      }, 1500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 启动脚本
init();
