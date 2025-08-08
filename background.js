/**
 * GitHub Enhanced Downloader - Background Script (Refactored)
 * 支持新的 Popup 界面和 API 故障转移逻辑
 */

// ==================== 常量定义 ====================
const PRIMARY_HOST = "github.com";
const MIRROR_HOST = "kkgithub.com";
const GITHUB_STATUS_KEY = "github_network_status";

/*
 * GitHub状态存储结构:
 * {
 *   accessible: boolean,           // GitHub是否可访问
 *   consecutiveFailures: number,   // 连续失败次数计数器
 *   checkedAt: number,            // 最后检查时间戳
 *   lastError: string             // 最后的错误信息
 * }
 */

// ==================== 核心功能：获取和处理发行版数据 ====================

/**
 * 核心函数：获取、处理并返回发行版数据
 * 实现 API 故障转移逻辑
 * @param {string} owner - 仓库所有者
 * @param {string} repo - 仓库名称
 * @returns {Object} 处理后的发行版数据或错误信息
 */
async function fetchAndProcessReleases(owner, repo) {
  try {
    console.log(`GitHub Enhanced Downloader: 开始获取 ${owner}/${repo} 的发行版数据`);
    
    // 1. 从存储中读取镜像配置
    const mirrorConfig = await loadMirrorConfiguration();
    
    // 2. 构建 API 端点列表（官方 API + 镜像 API）
    const endpoints = buildApiEndpoints(owner, repo, mirrorConfig);
    
    // 3. 依次尝试每个端点
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        console.log(`GitHub Enhanced Downloader: 尝试端点 ${endpoint.name}: ${endpoint.url}`);
        
        // 尝试获取数据
        const response = await fetch(endpoint.url, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Enhanced-Downloader/2.1.0'
          },
          signal: AbortSignal.timeout(10000) // 10秒超时
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const releasesData = await response.json();
        console.log(`GitHub Enhanced Downloader: 成功从 ${endpoint.name} 获取到 ${releasesData.length} 个发行版`);
        
        // 4. 处理数据（版本分组、生成镜像链接等）
        const processedData = processReleasesData(releasesData, mirrorConfig);
        
        return {
          success: true,
          data: processedData.groups,
          totalCount: processedData.totalCount,
          groupCount: processedData.groups.length,
          source: endpoint.name
        };
        
      } catch (error) {
        lastError = error;
        console.warn(`GitHub Enhanced Downloader: 端点 ${endpoint.name} 失败:`, error.message);
        continue; // 尝试下一个端点
      }
    }
    
    // 5. 所有端点都失败
    console.error('GitHub Enhanced Downloader: 所有 API 端点都失败');
    return {
      success: false,
      error: `无法获取发行版数据：${lastError?.message || '所有API端点都不可用'}`,
      endpoints: endpoints.map(e => ({ name: e.name, url: e.url }))
    };
    
  } catch (error) {
    console.error('GitHub Enhanced Downloader: fetchAndProcessReleases 执行失败:', error);
    return {
      success: false,
      error: `处理失败: ${error.message}`
    };
  }
}

/**
 * 加载镜像配置
 * @returns {Object} 镜像配置对象
 */
async function loadMirrorConfiguration() {
  try {
    // 尝试从新格式加载配置（与 popup.js 兼容）
    const newConfigResult = await chrome.storage.sync.get(['mirrorConfig']);
    if (newConfigResult.mirrorConfig) {
      console.log('GitHub Enhanced Downloader: 使用新格式镜像配置');
      return newConfigResult.mirrorConfig;
    }
    
    // 回退到旧格式
    const oldConfigResult = await chrome.storage.sync.get(['mirrorSettings']);
    if (oldConfigResult.mirrorSettings) {
      console.log('GitHub Enhanced Downloader: 转换旧格式镜像配置');
      return convertOldConfigToNew(oldConfigResult.mirrorSettings);
    }
    
    // 使用默认配置
    console.log('GitHub Enhanced Downloader: 使用默认镜像配置');
    return getDefaultMirrorConfig();
    
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 加载镜像配置失败:', error);
    return getDefaultMirrorConfig();
  }
}

/**
 * 获取默认镜像配置
 * @returns {Object} 默认配置
 */
function getDefaultMirrorConfig() {
  return {
    mirrors: [
      {
        name: "KKGitHub",
        enabled: true,
        urlPattern: "${url}.replace(\"github.com\", \"kkgithub.com\")",
        description: "KKGitHub镜像加速"
      },
      {
        name: "BGitHub", 
        enabled: true,
        urlPattern: "${url}.replace(\"github.com\", \"bgithub.xyz\")",
        description: "BGitHub镜像加速"
      },
      {
        name: "GitFun",
        enabled: true, 
        urlPattern: "${url}.replace(\"github.com\", \"github.ur1.fun\")",
        description: "GitFun镜像加速"
      }
    ],
    autoRedirect: {
      enabled: false,  // 默认禁用自动重定向，让用户主动选择
      preferredMirror: "KKGitHub",
      checkInterval: 300000
    }
  };
}

/**
 * 转换旧格式配置到新格式
 * @param {Object} oldConfig - 旧格式配置
 * @returns {Object} 新格式配置
 */
function convertOldConfigToNew(oldConfig) {
  const newConfig = {
    mirrors: [],
    autoRedirect: {
      enabled: false,  // 转换旧配置时也默认禁用自动重定向
      preferredMirror: "KKGitHub",
      checkInterval: 300000
    }
  };
  
  // 转换预设镜像
  if (oldConfig.presetMirrors) {
    oldConfig.presetMirrors.forEach(mirror => {
      if (mirror.enabled && mirror.name !== 'GitHub官方') {
        newConfig.mirrors.push({
          name: mirror.name,
          enabled: true,
          urlPattern: mirror.rule,
          description: mirror.description || mirror.name
        });
      }
    });
  }
  
  // 转换自定义镜像
  if (oldConfig.customMirrors) {
    oldConfig.customMirrors.forEach(mirror => {
      if (mirror.enabled) {
        newConfig.mirrors.push({
          name: mirror.name,
          enabled: true,
          urlPattern: mirror.rule,
          description: mirror.description || mirror.name
        });
      }
    });
  }
  
  return newConfig;
}

/**
 * 构建 API 端点列表
 * @param {string} owner - 仓库所有者
 * @param {string} repo - 仓库名称
 * @param {Object} mirrorConfig - 镜像配置
 * @returns {Array} 端点列表
 */
function buildApiEndpoints(owner, repo, mirrorConfig) {
  const endpoints = [];
  
  // 1. 官方 GitHub API（优先）
  endpoints.push({
    name: "GitHub Official API",
    url: `https://api.github.com/repos/${owner}/${repo}/releases`,
    type: "official"
  });
  
  // 2. 镜像 API 端点
  if (mirrorConfig.mirrors) {
    mirrorConfig.mirrors.forEach(mirror => {
      if (mirror.enabled) {
        try {
          // 尝试生成镜像 API URL
          const apiUrl = generateMirrorApiUrl(owner, repo, mirror);
          if (apiUrl) {
            endpoints.push({
              name: `${mirror.name} API`,
              url: apiUrl,
              type: "mirror",
              mirror: mirror.name
            });
          }
        } catch (error) {
          console.warn(`GitHub Enhanced Downloader: 无法为 ${mirror.name} 生成 API URL:`, error);
        }
      }
    });
  }
  
  console.log(`GitHub Enhanced Downloader: 构建了 ${endpoints.length} 个 API 端点:`, 
    endpoints.map(e => `${e.name}: ${e.url}`));
  
  return endpoints;
}

/**
 * 生成镜像 API URL
 * @param {string} owner - 仓库所有者
 * @param {string} repo - 仓库名称
 * @param {Object} mirror - 镜像配置
 * @returns {string|null} 镜像 API URL
 */
function generateMirrorApiUrl(owner, repo, mirror) {
  try {
    // 对于已知的镜像站点，使用其 API 端点
    const mirrorApiMappings = {
      'KKGitHub': `https://api.kkgithub.com/repos/${owner}/${repo}/releases`,
      'BGitHub': `https://api.bgithub.xyz/repos/${owner}/${repo}/releases`,
      'GitFun': `https://api.github.ur1.fun/repos/${owner}/${repo}/releases`
    };
    
    if (mirrorApiMappings[mirror.name]) {
      return mirrorApiMappings[mirror.name];
    }
    
    // 对于自定义镜像，尝试从 URL 模式推断 API
    if (mirror.urlPattern) {
      const testUrl = `https://github.com/repos/${owner}/${repo}/releases`;
      const mirrorUrl = generateMirrorUrl(testUrl, mirror.urlPattern);
      
      if (mirrorUrl && mirrorUrl !== testUrl) {
        return mirrorUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`GitHub Enhanced Downloader: 生成镜像 API URL 失败:`, error);
    return null;
  }
}

/**
 * 处理发行版数据
 * @param {Array} releasesData - 原始发行版数据
 * @param {Object} mirrorConfig - 镜像配置
 * @returns {Object} 处理后的数据
 */
function processReleasesData(releasesData, mirrorConfig) {
  console.log(`GitHub Enhanced Downloader: 开始处理 ${releasesData.length} 个发行版`);
  
  // 1. 处理每个发行版，生成镜像链接
  const processedReleases = releasesData.map(release => {
    const processedRelease = {
      name: release.name || release.tag_name,
      tag_name: release.tag_name,
      published_at: release.published_at,
      body: release.body || '',
      draft: release.draft,
      prerelease: release.prerelease,
      assets: []
    };
    
    // 处理资源文件
    if (release.assets && Array.isArray(release.assets)) {
      processedRelease.assets = release.assets.map(asset => {
        const processedAsset = {
          name: asset.name,
          size: asset.size,
          download_count: asset.download_count || 0,
          content_type: asset.content_type || '',
          download_links: []
        };
        
        // 添加官方下载链接
        processedAsset.download_links.push({
          name: 'GitHub',
          url: asset.browser_download_url,
          type: 'official'
        });
        
        // 生成镜像下载链接
        if (mirrorConfig.mirrors) {
          mirrorConfig.mirrors.forEach(mirror => {
            if (mirror.enabled) {
              const mirrorUrl = generateMirrorUrl(asset.browser_download_url, mirror.urlPattern);
              if (mirrorUrl && mirrorUrl !== asset.browser_download_url) {
                processedAsset.download_links.push({
                  name: mirror.name,
                  url: mirrorUrl,
                  type: 'mirror'
                });
              }
            }
          });
        }
        
        return processedAsset;
      });
    }
    
    return processedRelease;
  });
  
  // 2. 版本分组
  const versionGroups = groupReleasesByVersion(processedReleases);
  
  // 3. 转换为数组并排序
  const sortedGroups = convertToSortedArray(versionGroups);
  
  return {
    groups: sortedGroups,
    totalCount: processedReleases.length
  };
}

/**
 * 生成镜像URL
 * @param {string} originalUrl - 原始URL
 * @param {string} urlPattern - URL模式
 * @returns {string|null} 镜像URL
 */
function generateMirrorUrl(originalUrl, urlPattern) {
  try {
    if (!originalUrl || !urlPattern) {
      return null;
    }
    
    console.log(`GitHub Enhanced Downloader: 生成镜像URL - 原URL: ${originalUrl}, 模式: ${urlPattern}`);
    
    // 1. 如果是模板字符串格式 ${url}
    if (urlPattern.includes('${url}')) {
      try {
        // 构建模板字符串并执行
        const template = urlPattern.replace(/\$\{url\}/g, originalUrl);
        
        // 如果包含JavaScript方法调用，需要执行
        if (template.includes('.replace(')) {
          const result = eval(template);
          console.log(`GitHub Enhanced Downloader: 模板字符串结果: ${result}`);
          return result;
        }
        
        return template;
      } catch (evalError) {
        console.warn('GitHub Enhanced Downloader: 模板字符串执行失败，使用正则替换:', evalError);
        
        // 回退到正则表达式解析
        const replaceMatch = urlPattern.match(/\$\{url\}\.replace\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/);
        if (replaceMatch) {
          const [, searchStr, replaceStr] = replaceMatch;
          const result = originalUrl.replace(new RegExp(searchStr, 'g'), replaceStr);
          console.log(`GitHub Enhanced Downloader: 正则替换结果: ${result}`);
          return result;
        }
        
        return originalUrl;
      }
    } 
    // 2. 如果是直接的JavaScript表达式格式 (没有${url}模板)
    else if (urlPattern.includes('.replace(')) {
      try {
        // 安全的JavaScript表达式执行
        const safeEval = new Function('url', `return ${urlPattern}`);
        const result = safeEval(originalUrl);
        console.log(`GitHub Enhanced Downloader: JavaScript表达式结果: ${result}`);
        return result;
      } catch (evalError) {
        console.warn('GitHub Enhanced Downloader: JavaScript表达式执行失败:', evalError);
        
        // 回退到正则表达式解析
        const replaceMatch = urlPattern.match(/url\.replace\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/);
        if (replaceMatch) {
          const [, searchStr, replaceStr] = replaceMatch;
          const result = originalUrl.replace(new RegExp(searchStr, 'g'), replaceStr);
          console.log(`GitHub Enhanced Downloader: 回退正则替换结果: ${result}`);
          return result;
        }
        
        return originalUrl;
      }
    } 
    // 3. 处理其他占位符
    else {
      const url = new URL(originalUrl);
      const result = urlPattern
        .replace(/\$\{domain\}/g, url.hostname)
        .replace(/\$\{path\}/g, url.pathname)
        .replace(/\$\{protocol\}/g, url.protocol);
      console.log(`GitHub Enhanced Downloader: 占位符替换结果: ${result}`);
      return result;
    }
  } catch (error) {
    console.warn(`GitHub Enhanced Downloader: 生成镜像链接失败 (${urlPattern}):`, error);
    return null;
  }
}

// ==================== 统一消息路由器 ====================

/**
 * 统一的消息路由器
 * 处理来自 content.js 和 popup.js 的所有消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('GitHub Enhanced Downloader: 收到消息', message);
  
  // 路由不同类型的消息
  switch (message.type || message.action) {
    case 'FETCH_RELEASES':
      handleFetchReleasesMessage(message, sendResponse);
      return true; // 保持异步响应通道开放
      
    case 'INITIATE_DOWNLOAD':
      handleInitiateDownloadMessage(message, sendResponse);
      return true; // 保持异步响应通道开放
      
    case 'RELOAD_MIRRORS':
    case 'updateMirrorConfig':
      handleUpdateMirrorConfig(message, sendResponse);
      return true;
      
    case 'checkGithubStatus':
      handleCheckGithubStatus(sendResponse);
      return true;
      
    default:
      console.warn('GitHub Enhanced Downloader: 未知消息类型:', message.type || message.action);
      sendResponse({ success: false, error: '未知消息类型' });
      return false;
  }
});

/**
 * 处理获取发行版数据的消息
 */
async function handleFetchReleasesMessage(message, sendResponse) {
  try {
    const { owner, repo } = message;
    
    if (!owner || !repo) {
      sendResponse({ 
        success: false, 
        error: '缺少必要的仓库信息' 
      });
      return;
    }
    
    // 调用核心函数
    const result = await fetchAndProcessReleases(owner, repo);
    sendResponse(result);
    
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 处理 FETCH_RELEASES 消息失败:', error);
    sendResponse({ 
      success: false, 
      error: `处理失败: ${error.message}` 
    });
  }
}

/**
 * 处理更新镜像配置的消息
 */
async function handleUpdateMirrorConfig(message, sendResponse) {
  try {
    console.log('GitHub Enhanced Downloader: 更新镜像配置');
    
    if (message.config) {
      await chrome.storage.sync.set({ mirrorConfig: message.config });
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 更新镜像配置失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 处理检查GitHub状态的消息
 */
async function handleCheckGithubStatus(sendResponse) {
  try {
    const status = await checkGithubStatus();
    sendResponse({ success: true, accessible: status });
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 检查GitHub状态失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ==================== 智能下载调度器 ====================

/**
 * 处理启动下载的消息
 * @param {Object} message - 包含originalUrl的消息对象
 * @param {Function} sendResponse - 响应函数
 */
async function handleInitiateDownloadMessage(message, sendResponse) {
  try {
    console.log('GitHub Enhanced Downloader: 启动智能下载调度器');
    
    if (!message.originalUrl) {
      sendResponse({ 
        success: false, 
        error: '缺少原始下载URL' 
      });
      return;
    }
    
    console.log(`GitHub Enhanced Downloader: 开始下载链式尝试: ${message.originalUrl}`);
    
    const success = await tryDownloadChain(message.originalUrl);
    
    sendResponse({ 
      success: true, 
      downloadInitiated: success,
      message: success ? '下载已启动' : '所有镜像站点均不可用'
    });
    
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 下载调度失败:', error);
    sendResponse({ 
      success: false, 
      error: `下载调度失败: ${error.message}` 
    });
  }
}

/**
 * 智能下载链式尝试核心函数
 * @param {string} originalUrl - 原始GitHub下载URL
 * @returns {Promise<boolean>} 是否成功启动下载
 */
async function tryDownloadChain(originalUrl) {
  try {
    console.log(`GitHub Enhanced Downloader: 开始链式下载尝试: ${originalUrl}`);
    
    // 1. 获取用户配置的镜像列表
    const mirrorConfig = await loadMirrorConfiguration();
    
    // 2. 构建有序的URL尝试列表
    const urlsToTry = buildDownloadUrlChain(originalUrl, mirrorConfig);
    
    console.log(`GitHub Enhanced Downloader: 构建了 ${urlsToTry.length} 个下载URL:`, urlsToTry);
    
    // 3. 链式尝试循环
    for (const urlData of urlsToTry) {
      console.log(`GitHub Enhanced Downloader: 尝试通过 ${urlData.source} 下载: ${urlData.url}`);
      
      const success = await attemptUrl(urlData.url, urlData.source);
      
      if (success) {
        console.log(`GitHub Enhanced Downloader: ✅ 通过 ${urlData.source} 成功启动下载`);
        return true;
      } else {
        console.log(`GitHub Enhanced Downloader: ❌ ${urlData.source} 下载失败，尝试下一个...`);
      }
    }
    
    console.log('GitHub Enhanced Downloader: ❌ 所有下载URL都失败了');
    return false;
    
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 链式下载尝试异常:', error);
    return false;
  }
}

/**
 * 构建下载URL链
 * @param {string} originalUrl - 原始URL
 * @param {Object} mirrorConfig - 镜像配置
 * @returns {Array} URL链数组
 */
function buildDownloadUrlChain(originalUrl, mirrorConfig) {
  const urlChain = [];
  
  // 1. 首先添加原始GitHub URL
  urlChain.push({
    url: originalUrl,
    source: 'GitHub Official',
    type: 'official'
  });
  
  // 2. 添加镜像站URL
  if (mirrorConfig.mirrors) {
    mirrorConfig.mirrors.forEach(mirror => {
      if (mirror.enabled) {
        try {
          const mirrorUrl = generateMirrorUrl(originalUrl, mirror.urlPattern);
          if (mirrorUrl && mirrorUrl !== originalUrl) {
            urlChain.push({
              url: mirrorUrl,
              source: mirror.name,
              type: 'mirror'
            });
          }
        } catch (error) {
          console.warn(`GitHub Enhanced Downloader: 为 ${mirror.name} 生成URL失败:`, error);
        }
      }
    });
  }
  
  return urlChain;
}

/**
 * 尝试单个URL下载
 * @param {string} url - 要尝试的URL
 * @param {string} source - URL来源名称
 * @returns {Promise<boolean>} 下载是否成功启动
 */
async function attemptUrl(url, source) {
  return new Promise((resolve) => {
    console.log(`GitHub Enhanced Downloader: 开始尝试 ${source}: ${url}`);
    
    let resolved = false;
    let tabId = null;
    let updateListener = null;
    let successTimer = null;
    
    // 清理函数
    const cleanup = () => {
      if (resolved) return; // 防止重复清理
      
      if (updateListener) {
        chrome.tabs.onUpdated.removeListener(updateListener);
        updateListener = null;
      }
      
      if (successTimer) {
        clearTimeout(successTimer);
        successTimer = null;
      }
    };
    
    // 1. 创建新标签页
    chrome.tabs.create({ url: url, active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error(`GitHub Enhanced Downloader: 创建标签页失败:`, chrome.runtime.lastError);
        cleanup();
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
        return;
      }
      
      tabId = tab.id;
      console.log(`GitHub Enhanced Downloader: 创建标签页 ${tabId} 用于 ${source}`);
      
      // 2. 创建标签页更新监听器
      updateListener = (updatedTabId, changeInfo, updatedTab) => {
        // 只监听我们刚创建的标签页
        if (updatedTabId !== tabId) return;
        
        // 检查URL变化
        if (changeInfo.url || updatedTab.url) {
          const currentUrl = changeInfo.url || updatedTab.url;
          
          console.log(`GitHub Enhanced Downloader: 标签页 ${tabId} URL变化: ${currentUrl}`);
          
          // 检查失败标志
          const failurePatterns = [
            'help.kkgithub.com',
            'help.bgithub.xyz',
            'help.github.ur1.fun',
            // 可以根据需要添加更多失败模式
          ];
          
          const isFailed = failurePatterns.some(pattern => 
            currentUrl && currentUrl.includes(pattern)
          );
          
          if (isFailed) {
            console.log(`GitHub Enhanced Downloader: ❌ 检测到失败页面: ${currentUrl}`);
            
            // 关闭失败的标签页
            chrome.tabs.remove(tabId, () => {
              console.log(`GitHub Enhanced Downloader: 已关闭失败的标签页 ${tabId}`);
            });
            
            cleanup();
            if (!resolved) {
              resolved = true;
              resolve(false);
            }
            return;
          }
        }
        
        // 检查加载完成
        if (changeInfo.status === 'complete') {
          console.log(`GitHub Enhanced Downloader: 标签页 ${tabId} 加载完成`);
        }
      };
      
      // 注册监听器
      chrome.tabs.onUpdated.addListener(updateListener);
      
      // 3. 设置成功超时（5秒后认为成功）
      successTimer = setTimeout(() => {
        console.log(`GitHub Enhanced Downloader: ✅ ${source} 在5秒内未检测到失败，认为成功`);
        
        cleanup();
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      }, 5000); // 5秒超时
    });
    
    // 4. 设置总超时（10秒）
    setTimeout(() => {
      if (!resolved) {
        console.log(`GitHub Enhanced Downloader: ⏰ ${source} 总超时`);
        
        if (tabId) {
          chrome.tabs.remove(tabId, () => {
            console.log(`GitHub Enhanced Downloader: 已关闭超时的标签页 ${tabId}`);
          });
        }
        
        cleanup();
        resolved = true;
        resolve(false);
      }
    }, 10000); // 10秒总超时
  });
}
// ==================== 保留的网络检测功能 ====================

/**
 * 智能网络状态检测函数
 * 检测 GitHub 是否可访问，使用连续失败机制提高准确性
 */
async function checkGithubStatus() {
  try {
    // 使用 AbortController 实现超时控制 - 延长到8秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
    
    // 尝试访问 GitHub favicon 来检测网络状态
    const response = await fetch('https://github.com/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    
    // 检查响应状态
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // 获取当前状态以便更新
    const currentStatus = await chrome.storage.local.get([GITHUB_STATUS_KEY]);
    
    // 成功：将状态设为可访问，并清零连续失败计数器
    await chrome.storage.local.set({
      [GITHUB_STATUS_KEY]: {
        accessible: true,
        consecutiveFailures: 0, // 清零失败计数器
        checkedAt: Date.now(),
        lastError: null
      }
    });
    
    console.log('GitHub Enhanced Downloader: GitHub网络检测成功 ✅ - 连续失败计数已清零');
    return true;
    
  } catch (error) {
    // 失败：使用连续失败机制
    const currentStatus = await chrome.storage.local.get([GITHUB_STATUS_KEY]);
    const currentData = currentStatus[GITHUB_STATUS_KEY] || {};
    
    // 递增连续失败计数器
    const newFailures = (currentData.consecutiveFailures || 0) + 1;
    
    // 只有当连续失败次数 >= 2 时，才将状态设为不可访问
    const shouldMarkInaccessible = newFailures >= 2;
    
    await chrome.storage.local.set({
      [GITHUB_STATUS_KEY]: {
        accessible: shouldMarkInaccessible ? false : (currentData.accessible !== false), // 保持之前状态除非达到阈值
        consecutiveFailures: newFailures,
        checkedAt: Date.now(),
        lastError: error.message
      }
    });
    
    if (shouldMarkInaccessible) {
      console.log(`GitHub Enhanced Downloader: GitHub网络检测失败 ❌ - 连续失败${newFailures}次，标记为不可访问`, error.message);
    } else {
      console.log(`GitHub Enhanced Downloader: GitHub网络检测失败 ⚠️ - 连续失败${newFailures}次，暂不标记为不可访问`, error.message);
    }
    
    return !shouldMarkInaccessible; // 返回true除非达到失败阈值
  }
}

/**
 * 智能重定向监听器 - 使用"按需复核"机制
 * 当用户访问 GitHub 但网络不可达时自动重定向到镜像站
 * 同时处理镜像站失效时的自动切换
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 检查标签页状态和URL - 改进触发条件
  if ((changeInfo.status !== 'loading' && changeInfo.status !== 'complete') || !tab.url) {
    return;
  }
  
  try {
    const url = new URL(tab.url);
    
    // 1. 检查是否是镜像站的帮助页面或失效页面
    if (isMirrorHelpPage(url)) {
      await handleMirrorFailover(tabId, url, tab.url);
      return;
    }
    
    // 2. 检查是否是GitHub主站URL（排除API和其他子域名）
    if (url.hostname === PRIMARY_HOST) {
      // 首先检查用户是否启用了自动重定向功能
      const mirrorConfig = await loadMirrorConfiguration();
      
      // 如果用户没有启用自动重定向，直接返回
      if (!mirrorConfig.autoRedirect || !mirrorConfig.autoRedirect.enabled) {
        console.log('GitHub Enhanced Downloader: 自动重定向未启用，跳过');
        return;
      }
      
      // ===== 实现"按需复核"机制 =====
      
      // 步骤1: 读取存储中的GitHub访问状态
      const statusResult = await chrome.storage.local.get([GITHUB_STATUS_KEY]);
      const githubStatus = statusResult[GITHUB_STATUS_KEY] || {};
      
      console.log('GitHub Enhanced Downloader: 读取到的GitHub状态:', githubStatus);
      
      // 步骤2: 如果状态为可访问(true)，直接放行，不执行任何操作
      if (githubStatus.accessible === true) {
        console.log('GitHub Enhanced Downloader: GitHub状态为可访问，直接放行 ✅');
        return;
      }
      
      // 步骤3: 如果状态为不可访问(false)，不要立即跳转，而是进行实时复核
      console.log('GitHub Enhanced Downloader: GitHub状态为不可访问，开始实时复核...');
      
      // 当场立刻异步调用一次checkGithubStatus()函数进行"复核"
      const reconfirmResult = await checkGithubStatus();
      
      // 步骤4: 读取复核后的最新状态
      const updatedStatusResult = await chrome.storage.local.get([GITHUB_STATUS_KEY]);
      const updatedGithubStatus = updatedStatusResult[GITHUB_STATUS_KEY] || {};
      
      console.log('GitHub Enhanced Downloader: 复核结果:', {
        reconfirmResult,
        updatedStatus: updatedGithubStatus
      });
      
      // 步骤5: 只有在复核也确认不可访问时，才执行重定向
      if (updatedGithubStatus.accessible !== true) {
        const redirectResult = await getPreferredMirrorHost(mirrorConfig);
        
        // 构建镜像URL
        const newUrl = tab.url.replace(`https://${PRIMARY_HOST}`, `https://${redirectResult.host}`);
        
        console.log('GitHub Enhanced Downloader: 执行自动重定向（复核确认不可访问）', {
          original: tab.url,
          redirect: newUrl,
          mirror: redirectResult.name,
          host: redirectResult.host,
          consecutiveFailures: updatedGithubStatus.consecutiveFailures || 0,
          reason: 'GitHub复核确认不可访问且用户启用了自动重定向'
        });
        
        // 更新标签页地址
        await chrome.tabs.update(tabId, { url: newUrl });
        
        // 发送通知给content script（如果可能）
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: 'REDIRECT_NOTIFICATION',
            from: PRIMARY_HOST,
            to: redirectResult.host,
            reason: 'GitHub网络不可达（已复核确认）'
          });
        } catch (e) {
          // content script可能还没加载，忽略错误
        }
        
      } else {
        console.log('GitHub Enhanced Downloader: 跳过重定向 - 复核显示GitHub可正常访问 ✅');
      }
    }
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 重定向过程出错', error);
  }
});

/**
 * 检查是否是镜像站的帮助页面或失效页面
 */
function isMirrorHelpPage(url) {
  const helpPages = [
    'help.kkgithub.com',
    'help.bgithub.xyz', 
    'help.github.ur1.fun'
  ];
  
  const failurePatterns = [
    /kkgithub\.com.*\/help/,
    /bgithub\.xyz.*\/help/,
    /github\.ur1\.fun.*\/help/,
    /help\.kkgithub\.com/,
    /help\.bgithub\.xyz/,
    /help\.github\.ur1\.fun/
  ];
  
  // 检查是否是帮助域名
  if (helpPages.includes(url.hostname)) {
    return true;
  }
  
  // 检查是否匹配失效模式
  return failurePatterns.some(pattern => pattern.test(url.href));
}

/**
 * 处理镜像站故障转移
 */
async function handleMirrorFailover(tabId, url, originalUrl) {
  try {
    console.log('GitHub Enhanced Downloader: 检测到镜像站失效页面', {
      hostname: url.hostname,
      href: url.href
    });
    
    const mirrorConfig = await loadMirrorConfiguration();
    
    // 如果自动重定向未启用，不进行故障转移
    if (!mirrorConfig.autoRedirect || !mirrorConfig.autoRedirect.enabled) {
      console.log('GitHub Enhanced Downloader: 自动重定向未启用，跳过镜像故障转移');
      return;
    }
    
    // 获取当前失效的镜像站
    const currentMirror = getCurrentMirrorFromUrl(url);
    
    // 获取备用镜像站
    const alternativeMirror = getAlternativeMirror(mirrorConfig, currentMirror);
    
    if (alternativeMirror) {
      // 尝试构建原始GitHub URL
      let githubUrl = originalUrl;
      
      // 如果当前是帮助页面，尝试恢复到GitHub主页
      if (isMirrorHelpPage(url)) {
        githubUrl = 'https://github.com/';
        
        // 尝试从referrer或历史记录中获取原始URL
        try {
          const tabs = await chrome.tabs.query({active: true, currentWindow: true});
          if (tabs[0] && tabs[0].url) {
            // 简单恢复逻辑：如果URL看起来像仓库页面，保留路径
            const pathMatch = url.pathname.match(/^\/([^\/]+\/[^\/]+)/);
            if (pathMatch) {
              githubUrl = `https://github.com${url.pathname}${url.search}`;
            }
          }
        } catch (e) {
          console.log('无法恢复原始路径，使用GitHub主页');
        }
      }
      
      // 构建新的镜像URL
      const newUrl = githubUrl.replace('https://github.com', `https://${alternativeMirror.host}`);
      
      console.log('GitHub Enhanced Downloader: 执行镜像故障转移', {
        failedMirror: currentMirror,
        alternative: alternativeMirror.name,
        original: originalUrl,
        redirect: newUrl,
        reason: '当前镜像站失效，自动切换备用镜像'
      });
      
      // 更新标签页地址
      await chrome.tabs.update(tabId, { url: newUrl });
      
      // 发送通知
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'REDIRECT_NOTIFICATION',
          from: currentMirror || '失效镜像',
          to: alternativeMirror.host,
          reason: '镜像站失效，已自动切换'
        });
      } catch (e) {
        // 忽略消息发送错误
      }
      
    } else {
      console.log('GitHub Enhanced Downloader: 没有找到可用的备用镜像站');
    }
    
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 镜像故障转移失败', error);
  }
}

/**
 * 从URL获取当前镜像站名称
 */
function getCurrentMirrorFromUrl(url) {
  if (url.hostname.includes('kkgithub.com')) {
    return 'KKGitHub';
  } else if (url.hostname.includes('bgithub.xyz')) {
    return 'BGitHub';
  } else if (url.hostname.includes('github.ur1.fun')) {
    return 'GitFun';
  }
  return null;
}

/**
 * 获取备用镜像站
 */
function getAlternativeMirror(mirrorConfig, currentMirror) {
  const mirrorPriority = ['BGitHub', 'GitFun', 'KKGitHub'];
  
  // 从优先级列表中排除当前失效的镜像
  const availableMirrors = mirrorPriority.filter(name => name !== currentMirror);
  
  // 查找第一个可用的镜像
  for (const mirrorName of availableMirrors) {
    const mirror = mirrorConfig.mirrors.find(m => m.name === mirrorName);
    if (mirror) {
      return {
        name: mirrorName,
        host: extractHostFromPattern(mirror.urlPattern)
      };
    }
  }
  
  return null;
}

/**
 * 从URL模式中提取主机名
 */
function extractHostFromPattern(urlPattern) {
  if (urlPattern.includes('kkgithub.com')) {
    return 'kkgithub.com';
  } else if (urlPattern.includes('bgithub.xyz')) {
    return 'bgithub.xyz';
  } else if (urlPattern.includes('github.ur1.fun')) {
    return 'github.ur1.fun';
  }
  return 'kkgithub.com'; // 默认
}

/**
 * 获取首选镜像站主机
 */
async function getPreferredMirrorHost(mirrorConfig) {
  const preferredMirror = mirrorConfig.autoRedirect.preferredMirror || 'KKGitHub';
  let mirrorHost = MIRROR_HOST; // 默认备选
  
  // 查找用户首选的镜像站域名
  const enabledMirror = mirrorConfig.mirrors.find(m => m.name === preferredMirror);
  if (enabledMirror) {
    mirrorHost = extractHostFromPattern(enabledMirror.urlPattern);
  }
  
  return {
    name: preferredMirror,
    host: mirrorHost
  };
}

// 添加webNavigation监听器作为补充
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // 只处理主框架导航
  if (details.frameId !== 0) {
    return;
  }
  
  try {
    const url = new URL(details.url);
    
    // 1. 检查是否是镜像站的帮助页面或失效页面
    if (isMirrorHelpPage(url)) {
      await handleMirrorFailover(details.tabId, url, details.url);
      return;
    }
    
    // 2. 检查是否是GitHub主站URL
    if (url.hostname === PRIMARY_HOST) {
      const mirrorConfig = await loadMirrorConfiguration();
      
      // 检查自动重定向是否启用
      if (!mirrorConfig.autoRedirect || !mirrorConfig.autoRedirect.enabled) {
        return;
      }
      
      // 检测GitHub可访问性
      const isAccessible = await checkGithubStatus();
      
      if (!isAccessible) {
        const redirectResult = await getPreferredMirrorHost(mirrorConfig);
        const newUrl = details.url.replace(`https://${PRIMARY_HOST}`, `https://${redirectResult.host}`);
        
        console.log('GitHub Enhanced Downloader: webNavigation重定向', {
          original: details.url,
          redirect: newUrl,
          mirror: redirectResult.name
        });
        
        // 更新导航
        await chrome.tabs.update(details.tabId, { url: newUrl });
      }
    }
  } catch (error) {
    console.error('GitHub Enhanced Downloader: webNavigation重定向失败', error);
  }
});

// ==================== 数据处理辅助函数 ====================

/**
 * 按版本分组发行版
 * @param {Array} releases - 发行版数组
 * @returns {Object} 分组后的版本对象
 */
function groupReleasesByVersion(releases) {
  const versionGroups = {};
  
  releases.forEach(release => {
    const majorVersion = extractMajorVersion(release.tag_name);
    
    if (!versionGroups[majorVersion]) {
      versionGroups[majorVersion] = [];
    }
    
    versionGroups[majorVersion].push(release);
  });

  console.log('GitHub Enhanced Downloader: 版本分组结果', Object.keys(versionGroups));
  return versionGroups;
}

/**
 * 提取主版本号
 * @param {string} tagName - 标签名称
 * @returns {string} 主版本号
 */
function extractMajorVersion(tagName) {
  if (!tagName || typeof tagName !== 'string') {
    return 'Other';
  }

  // 使用正则表达式提取第一个数字序列作为主版本号
  const versionMatch = tagName.match(/(?:v|V)?(\d+)/);
  
  if (versionMatch && versionMatch[1]) {
    return versionMatch[1];
  }
  
  // 如果无法匹配，归类到 "Other" 分组
  return 'Other';
}

/**
 * 将分组对象转换为有序数组
 * @param {Object} versionGroups - 版本分组对象
 * @returns {Array} 排序后的分组数组
 */
function convertToSortedArray(versionGroups) {
  const groupsArray = Object.entries(versionGroups).map(([version, releases]) => ({
    groupName: version === 'Other' ? 'Other' : `v${version}`,
    majorVersion: version === 'Other' ? -1 : parseInt(version, 10),
    releases: releases.sort((a, b) => {
      // 在每个组内按发布时间降序排列（最新的在前）
      return new Date(b.published_at) - new Date(a.published_at);
    })
  }));

  // 按主版本号数字降序排列（最新的大版本在前），Other分组放在最后
  groupsArray.sort((a, b) => {
    if (a.majorVersion === -1) return 1;  // Other 放在最后
    if (b.majorVersion === -1) return -1; // Other 放在最后
    return b.majorVersion - a.majorVersion; // 数字降序
  });

  // 移除临时的 majorVersion 字段，只保留需要的数据
  return groupsArray.map(group => ({
    groupName: group.groupName,
    releases: group.releases
  }));
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== 扩展生命周期事件 ====================

/**
 * 扩展安装/更新事件
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('GitHub Enhanced Downloader: 插件已安装/更新');
  
  // 立即执行一次网络检测
  await checkGithubStatus();
  
  // 创建定时检测任务
  chrome.alarms.create('githubStatusAlarm', {
    delayInMinutes: 5,
    periodInMinutes: 5
  });
  
  // 如果是首次安装，设置默认配置
  if (details.reason === 'install') {
    await setDefaultConfigurations();
  }
});

/**
 * 浏览器启动事件
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('GitHub Enhanced Downloader: 浏览器启动');
  
  // 立即执行一次网络检测
  await checkGithubStatus();
  
  // 创建定时检测任务
  chrome.alarms.create('githubStatusAlarm', {
    delayInMinutes: 5,
    periodInMinutes: 5
  });
});

/**
 * 定时任务监听器
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'githubStatusAlarm') {
    await checkGithubStatus();
  }
});

/**
 * 设置默认配置
 */
async function setDefaultConfigurations() {
  try {
    const defaultConfig = getDefaultMirrorConfig();
    await chrome.storage.sync.set({ mirrorConfig: defaultConfig });
    console.log('GitHub Enhanced Downloader: 默认配置已设置');
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 设置默认配置失败:', error);
  }
}

// ==================== 初始化 ====================

console.log('GitHub Enhanced Downloader v2.3.0: 后台脚本已加载 (UI回滚到多镜像链接显示)');

// 初始化检查
(async () => {
  try {
    await checkGithubStatus();
    console.log('GitHub Enhanced Downloader: 初始化完成');
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 初始化失败:', error);
  }
})();
