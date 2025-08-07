// GitHub Enhanced Downloader - Content Script

// 全局变量
let isButtonAdded = false;
let currentModal = null;
let extensionValid = true;

// 检查扩展上下文是否有效
function checkExtensionContext() {
  try {
    if (!chrome.runtime?.id) {
      // 降低日志级别，避免过多警告
      console.debug('GitHub Enhanced Downloader: 扩展上下文已失效');
      extensionValid = false;
      return false;
    }
    extensionValid = true;
    return true;
  } catch (error) {
    console.debug('GitHub Enhanced Downloader: 扩展上下文检查失败', error);
    extensionValid = false;
    return false;
  }
}

// 定期检查扩展状态并更新按钮状态
function setupExtensionMonitoring() {
  setInterval(() => {
    const isValid = checkExtensionContext();
    const button = document.getElementById('enhanced-downloader-btn');
    
    if (button) {
      if (!isValid) {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.title = '扩展已更新，请刷新页面';
        button.textContent = '🔄 需要刷新';
      } else if (button.disabled && extensionValid) {
        button.disabled = false;
        button.style.opacity = '1';
        button.title = '';
        
        // 安全地获取i18n文本
        let buttonText = '🚀 下载发行版';
        try {
          buttonText = '🚀 ' + chrome.i18n.getMessage('downloadReleases');
        } catch (e) {
          console.warn('无法获取i18n消息，使用默认文本');
        }
        button.textContent = buttonText;
      }
    }
  }, 3000); // 每3秒检查一次
}

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
  
  // 安全地获取i18n文本
  let buttonText = '🚀 下载发行版';
  try {
    if (chrome.runtime?.id) {
      buttonText = '🚀 ' + chrome.i18n.getMessage('downloadReleases');
    }
  } catch (e) {
    console.warn('无法获取i18n消息，使用默认文本');
  }
  
  downloadBtn.textContent = buttonText;
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
    // 检查扩展上下文是否有效
    if (!checkExtensionContext()) {
      button.disabled = true;
      button.style.opacity = '0.5';
      button.textContent = '🔄 需要刷新';
      button.title = '扩展已更新，请刷新页面';
      showErrorModal('扩展已更新，请刷新页面后重试');
      return;
    }

    // a. 显示加载状态 - 使用安全的方式获取文本
    let loadingText = '⏳ 加载中...';
    try {
      loadingText = '⏳ ' + chrome.i18n.getMessage('loading');
    } catch (e) {
      // 如果i18n失败，使用默认文本
      console.warn('无法获取i18n消息，使用默认文本');
    }
    
    button.textContent = loadingText;
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';

    // b. 解析仓库信息
    const repoInfo = extractRepoInfo();
    if (!repoInfo) {
      throw new Error('无法从URL中提取仓库信息');
    }

    console.log('GitHub Enhanced Downloader: 提取到仓库信息', repoInfo);

    // c. 使用Promise包装消息发送以增强错误处理
    const response = await new Promise((resolve, reject) => {
      // 再次检查扩展上下文
      if (!chrome.runtime?.id) {
        reject(new Error('扩展已更新，请刷新页面后重试'));
        return;
      }

      // 设置超时
      const timeoutId = setTimeout(() => {
        reject(new Error('请求超时，请重试'));
      }, 15000);

      chrome.runtime.sendMessage({
        type: 'FETCH_RELEASES',
        owner: repoInfo.owner,
        repo: repoInfo.repo
      }, (response) => {
        clearTimeout(timeoutId);

        // 检查运行时错误
        if (chrome.runtime.lastError) {
          console.error('GitHub Enhanced Downloader: 消息发送失败', chrome.runtime.lastError);
          const errorMsg = chrome.runtime.lastError.message;
          
          if (errorMsg.includes('Extension context invalidated')) {
            reject(new Error('扩展已更新，请刷新页面后重试'));
          } else if (errorMsg.includes('Could not establish connection')) {
            reject(new Error('无法连接到扩展后台，请重新加载扩展'));
          } else {
            reject(new Error('后台连接错误: ' + errorMsg));
          }
          return;
        }

        if (!response) {
          reject(new Error('后台脚本无响应，请重新加载扩展'));
          return;
        }

        resolve(response);
      });
    });

    // 恢复按钮状态
    button.textContent = originalText;
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';

    // 3. 处理响应数据
    if (response.success) {
      console.log('GitHub Enhanced Downloader: 成功获取到分组releases数据', response);
      showReleasesModal(response.data, repoInfo, response.totalCount, response.groupCount);
    } else {
      console.error('GitHub Enhanced Downloader: 获取releases失败', response.error);
      showErrorModal(response.error);
    }

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
    // 安全地获取i18n文本
    let noReleasesText = '暂无发行版';
    try {
      if (chrome.runtime?.id) {
        noReleasesText = chrome.i18n.getMessage('noReleases');
      }
    } catch (e) {
      console.warn('无法获取i18n消息，使用默认文本');
    }
    
    releasesList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #656d76;">
        <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
        <div>${noReleasesText}</div>
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
  
  // 安全地获取i18n文本
  let groupDisplayName;
  try {
    if (chrome.runtime?.id) {
      groupDisplayName = group.groupName === 'Other' ? 
        chrome.i18n.getMessage('versionGroup', ['Other']) : 
        chrome.i18n.getMessage('versionGroup', [group.groupName]);
    } else {
      throw new Error('Extension context invalid');
    }
  } catch (e) {
    console.warn('无法获取i18n消息，使用默认文本');
    groupDisplayName = group.groupName === 'Other' ? 
      `其他版本` : 
      `${group.groupName}.x 版本`;
  }
  
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
  
  // 创建文件信息行
  const fileInfoDiv = document.createElement('div');
  fileInfoDiv.style.cssText = `margin-bottom: 12px;`;
  fileInfoDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-weight: 500; color: #24292f; font-size: 14px;">${asset.name}</span>
        <span style="color: #656d76; margin-left: 8px; font-size: 12px;">(${fileSize})</span>
        ${asset.download_count ? `<span style="color: #656d76; margin-left: 8px; font-size: 12px;">↓ ${asset.download_count}</span>` : ''}
      </div>
    </div>
  `;

  // 创建智能下载按钮
  const downloadBtn = createIntelligentDownloadButton(asset);
  
  assetDiv.appendChild(fileInfoDiv);
  assetDiv.appendChild(downloadBtn);
  
  return assetDiv;
}

// 创建智能下载按钮
function createIntelligentDownloadButton(asset) {
  const button = document.createElement('button');
  button.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 10px 16px;
    background-color: #0969da;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    min-height: 36px;
  `;
  
  button.innerHTML = `
    <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="currentColor" viewBox="0 0 16 16">
      <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75z"></path>
      <path d="M3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"></path>
    </svg>
    智能下载
  `;
  
  button.title = '使用智能调度器自动选择最佳镜像下载';

  // 添加悬停效果
  button.addEventListener('mouseenter', () => {
    if (!button.disabled) {
      button.style.backgroundColor = '#0860ca';
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = '0 4px 8px rgba(9, 105, 218, 0.3)';
    }
  });

  button.addEventListener('mouseleave', () => {
    if (!button.disabled) {
      button.style.backgroundColor = '#0969da';
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = 'none';
    }
  });

  // 绑定点击事件 - 启动智能下载
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    await handleIntelligentDownload(asset, button);
  });

  return button;
}

// 处理智能下载
async function handleIntelligentDownload(asset, button) {
  const originalText = button.innerHTML;
  const originalBg = button.style.backgroundColor;
  
  try {
    // 显示加载状态
    button.innerHTML = `
      <svg style="width: 16px; height: 16px; margin-right: 8px; animation: spin 1s linear infinite;" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
      </svg>
      处理中...
    `;
    button.style.backgroundColor = '#6c757d';
    button.disabled = true;
    button.style.cursor = 'not-allowed';

    // 添加旋转动画
    if (!document.getElementById('spin-animation')) {
      const style = document.createElement('style');
      style.id = 'spin-animation';
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // 检查扩展上下文
    if (!checkExtensionContext()) {
      button.innerHTML = `
        <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z"/>
          <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z"/>
        </svg>
        需要刷新
      `;
      button.style.backgroundColor = '#dc3545';
      showIntelligentDownloadNotification('扩展已更新，请刷新页面后重试', 'error');
      return;
    }

    // 获取原始下载URL
    const originalUrl = getOriginalDownloadUrl(asset);
    if (!originalUrl) {
      throw new Error('未找到有效的下载链接');
    }

    console.log('GitHub Enhanced Downloader: 启动智能下载:', originalUrl);

    // 调用后台的智能下载调度器
    const response = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('智能下载请求超时'));
      }, 15000);

      chrome.runtime.sendMessage({
        type: 'INITIATE_DOWNLOAD',
        originalUrl: originalUrl
      }, (response) => {
        clearTimeout(timeoutId);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response) {
          reject(new Error('后台脚本无响应'));
          return;
        }

        resolve(response);
      });
    });

    // 处理响应
    if (response.success) {
      if (response.downloadInitiated) {
        button.innerHTML = `
          <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
          </svg>
          下载已启动
        `;
        button.style.backgroundColor = '#28a745';
        showIntelligentDownloadNotification('智能下载已启动，正在使用最佳镜像站', 'success');
        
        // 3秒后恢复按钮
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.backgroundColor = originalBg;
          button.disabled = false;
          button.style.cursor = 'pointer';
        }, 3000);
      } else {
        button.innerHTML = `
          <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="currentColor" viewBox="0 0 16 16">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
          </svg>
          下载失败
        `;
        button.style.backgroundColor = '#dc3545';
        showIntelligentDownloadNotification('所有镜像站点均不可用，请稍后重试', 'warning');
        
        // 5秒后恢复按钮
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.backgroundColor = originalBg;
          button.disabled = false;
          button.style.cursor = 'pointer';
        }, 5000);
      }
    } else {
      throw new Error(response.error || '智能下载失败');
    }

  } catch (error) {
    console.error('GitHub Enhanced Downloader: 智能下载失败:', error);
    
    button.innerHTML = `
      <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="currentColor" viewBox="0 0 16 16">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
      </svg>
      错误
    `;
    button.style.backgroundColor = '#dc3545';
    showIntelligentDownloadNotification(`智能下载失败: ${error.message}`, 'error');
    
    // 5秒后恢复按钮
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.backgroundColor = originalBg;
      button.disabled = false;
      button.style.cursor = 'pointer';
    }, 5000);
  }
}

// 获取原始下载URL
function getOriginalDownloadUrl(asset) {
  // 优先使用 browser_download_url
  if (asset.browser_download_url) {
    return asset.browser_download_url;
  }
  
  // 如果没有，尝试从 download_links 中获取官方链接
  if (asset.download_links && Array.isArray(asset.download_links)) {
    const officialLink = asset.download_links.find(link => link.type === 'official');
    if (officialLink) {
      return officialLink.url;
    }
    
    // 如果没有官方链接，使用第一个链接
    if (asset.download_links.length > 0) {
      return asset.download_links[0].url;
    }
  }
  
  // 如果都没有，返回 null
  return null;
}

// 显示智能下载通知
function showIntelligentDownloadNotification(message, type = 'info') {
  // 移除已存在的通知
  const existingNotification = document.getElementById('intelligent-download-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // 创建通知元素
  const notification = document.createElement('div');
  notification.id = 'intelligent-download-notification';
  
  const bgColors = {
    success: '#d4edda',
    warning: '#fff3cd',
    error: '#f8d7da',
    info: '#d1ecf1'
  };
  
  const borderColors = {
    success: '#c3e6cb',
    warning: '#faeaa3',
    error: '#f5c6cb',
    info: '#bee5eb'
  };
  
  const textColors = {
    success: '#155724',
    warning: '#856404',
    error: '#721c24',
    info: '#0c5460'
  };

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    background-color: ${bgColors[type] || bgColors.info};
    color: ${textColors[type] || textColors.info};
    border: 1px solid ${borderColors[type] || borderColors.info};
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10001;
    max-width: 350px;
    font-size: 14px;
    line-height: 1.4;
    animation: slideInRight 0.3s ease;
  `;

  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };

  notification.innerHTML = `
    <div style="display: flex; align-items: flex-start;">
      <span style="margin-right: 10px; margin-top: 1px; flex-shrink: 0;">
        ${icons[type] || icons.info}
      </span>
      <span style="flex: 1;">${message}</span>
    </div>
  `;

  // 添加动画样式
  if (!document.getElementById('intelligent-download-animations')) {
    const style = document.createElement('style');
    style.id = 'intelligent-download-animations';
    style.textContent = `
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideOutRight {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // 自动移除通知
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (notification && notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
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

// 检查是否为GitHub仓库页面（包括镜像站）
function isGitHubRepoPage() {
  const supportedHosts = [
    'github.com',
    'kkgithub.com', 
    'bgithub.xyz',
    'github.ur1.fun'
  ];
  
  return supportedHosts.includes(window.location.hostname) && 
         window.location.pathname.split('/').filter(Boolean).length >= 2;
}

// 初始化脚本
function init() {
  console.log('GitHub Enhanced Downloader: Content Script 已加载');
  
  // 启动扩展监控
  setupExtensionMonitoring();
  
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

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REDIRECT_NOTIFICATION') {
    // 显示重定向通知
    showRedirectNotification(message);
  }
});

// 显示重定向通知
function showRedirectNotification(info) {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #0969da;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slideInRight 0.3s ease;
  `;
  
  notification.innerHTML = `
    🚀 已自动跳转到镜像站<br>
    <small style="opacity: 0.8;">${info.reason}</small>
  `;
  
  // 添加动画样式
  if (!document.getElementById('redirect-animations')) {
    const style = document.createElement('style');
    style.id = 'redirect-animations';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // 3秒后自动消失
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// 启动脚本
init();
