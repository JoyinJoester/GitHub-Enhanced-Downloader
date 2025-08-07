// GitHub Enhanced Downloader - Background Script

// 1. 常量与状态定义
const PRIMARY_HOST = "github.com";
const MIRROR_HOST = "kkgithub.com";
const GITHUB_STATUS_KEY = "github_network_status";

// 2. 网络状态检测函数
async function checkGithubStatus() {
  try {
    // 使用 AbortController 实现超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
    
    // 尝试访问 GitHub favicon 来检测网络状态
    const response = await fetch('https://github.com/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    
    // 保存成功状态到本地存储
    await chrome.storage.local.set({
      [GITHUB_STATUS_KEY]: {
        accessible: true,
        checkedAt: Date.now()
      }
    });
    
    console.log('GitHub Enhanced Downloader: GitHub网络检测成功 ✅');
    return true;
    
  } catch (error) {
    // 保存失败状态到本地存储
    await chrome.storage.local.set({
      [GITHUB_STATUS_KEY]: {
        accessible: false,
        checkedAt: Date.now()
      }
    });
    
    console.log('GitHub Enhanced Downloader: GitHub网络检测失败 ❌', error.message);
    return false;
  }
}

// 3. 重定向监听器
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 检查标签页状态和URL
  if (changeInfo.status !== 'loading' || !tab.url) {
    return;
  }
  
  try {
    const url = new URL(tab.url);
    
    // 检查是否是GitHub主站URL（排除API和其他子域名）
    if (url.hostname === PRIMARY_HOST) {
      // 从本地存储获取网络状态
      const result = await chrome.storage.local.get([GITHUB_STATUS_KEY]);
      const networkStatus = result[GITHUB_STATUS_KEY];
      
      // 如果GitHub不可访问，执行重定向
      if (networkStatus && networkStatus.accessible === false) {
        // 构建镜像URL
        const newUrl = tab.url.replace(`https://${PRIMARY_HOST}`, `https://${MIRROR_HOST}`);
        
        console.log('GitHub Enhanced Downloader: 执行自动重定向', {
          original: tab.url,
          redirect: newUrl,
          reason: 'GitHub不可访问'
        });
        
        // 更新标签页地址
        await chrome.tabs.update(tabId, { url: newUrl });
      }
    }
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 重定向过程出错', error);
  }
});

// 4. 插件生命周期事件监听
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('GitHub Enhanced Downloader: 插件已安装/更新');
  
  // 立即执行一次网络检测
  await checkGithubStatus();
  
  // 创建定时检测任务
  chrome.alarms.create('githubStatusAlarm', {
    delayInMinutes: 5,
    periodInMinutes: 5
  });
  
  // 初始化发行版下载功能的镜像配置
  await initializeMirrors();
  
  // 如果是首次安装，设置默认配置
  if (details.reason === 'install') {
    await setDefaultConfigurations();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('GitHub Enhanced Downloader: 浏览器启动');
  
  // 立即执行一次网络检测
  await checkGithubStatus();
  
  // 创建定时检测任务
  chrome.alarms.create('githubStatusAlarm', {
    delayInMinutes: 5,
    periodInMinutes: 5
  });
  
  // 初始化镜像配置
  await initializeMirrors();
});

// 5. 定时任务监听器
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'githubStatusAlarm') {
    await checkGithubStatus();
  }
});

// ==================== 发行版下载数据处理功能 ====================
// 默认镜像配置
const DEFAULT_MIRRORS = [
  {
    name: 'BGitHub',
    rule: 'https://bgithub.xyz${url.replace("https://github.com", "")}',
    enabled: false
  },
  {
    name: 'KKGitHub', 
    rule: 'https://kkgithub.com${url.replace("https://github.com", "")}',
    enabled: false
  },
  {
    name: 'GitFun',
    rule: 'https://github.ur1.fun${url.replace("https://github.com", "")}',
    enabled: false
  }
];

// 当前使用的镜像配置
let currentMirrors = [];

// 初始化镜像配置
async function initializeMirrors() {
  try {
    const result = await chrome.storage.sync.get(['mirrorSettings']);
    
    if (result.mirrorSettings) {
      // 合并预设镜像和自定义镜像，只保留启用的
      const enabledPreset = result.mirrorSettings.presetMirrors
        .filter(mirror => mirror.enabled && mirror.name !== 'GitHub官方');
      const enabledCustom = result.mirrorSettings.customMirrors
        .filter(mirror => mirror.enabled);
      
      currentMirrors = [...enabledPreset, ...enabledCustom];
    } else {
      // 使用默认配置
      currentMirrors = DEFAULT_MIRRORS.filter(mirror => mirror.enabled);
    }
    
    console.log('GitHub Enhanced Downloader: 已加载镜像配置', currentMirrors);
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 加载镜像配置失败', error);
    currentMirrors = DEFAULT_MIRRORS.filter(mirror => mirror.enabled);
  }
}

// 设置默认配置
async function setDefaultConfigurations() {
  // 设置默认镜像配置
  const defaultSettings = {
    presetMirrors: [
      {
        name: 'GitHub官方',
        rule: '${url}',
        enabled: true,
        type: 'preset',
        description: '原始GitHub下载链接'
      },
      {
        name: 'BGitHub',
        rule: 'https://bgithub.xyz${url.replace("https://github.com", "")}',
        enabled: false,
        type: 'preset',
        description: 'BGitHub镜像加速服务'
      },
      {
        name: 'KKGitHub',
        rule: 'https://kkgithub.com${url.replace("https://github.com", "")}',
        enabled: false,
        type: 'preset',
        description: 'KKGitHub镜像加速服务'
      },
      {
        name: 'GitFun',
        rule: 'https://github.ur1.fun${url.replace("https://github.com", "")}',
        enabled: false,
        type: 'preset',
        description: 'GitFun镜像加速服务'
      }
    ],
    customMirrors: []
  };
  
  // 设置默认重定向配置
  const defaultRedirectSettings = {
    enabled: true,
    preferredMirror: 'KKGitHub',
    autoRedirect: true
  };
  
  await chrome.storage.sync.set({ 
    mirrorSettings: defaultSettings,
    redirectSettings: defaultRedirectSettings
  });
}

// 生成镜像URL
function generateMirrorUrl(originalUrl, rule) {
  try {
    if (rule.includes('${url}')) {
      return rule.replace(/\$\{url\}/g, originalUrl);
    } else if (rule.includes('.replace(')) {
      // 处理JavaScript表达式
      return eval(rule.replace(/\$\{url\}/g, `"${originalUrl}"`));
    } else {
      // 处理其他占位符
      const url = new URL(originalUrl);
      return rule
        .replace(/\$\{domain\}/g, url.hostname)
        .replace(/\$\{path\}/g, url.pathname)
        .replace(/\$\{protocol\}/g, url.protocol);
    }
  } catch (error) {
    console.warn(`GitHub Enhanced Downloader: 生成镜像链接失败 (${rule})`, error);
    return null;
  }
}

// 6. 保留原有的消息监听器 - 处理FETCH_RELEASES消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('GitHub Enhanced Downloader: 收到消息', message);
  
  // 处理重新加载镜像配置的消息
  if (message.type === 'RELOAD_MIRRORS') {
    initializeMirrors();
    sendResponse({ success: true });
    return true;
  }
  
  // 处理FETCH_RELEASES请求
  if (message.type === 'FETCH_RELEASES') {
    handleFetchReleases(message, sendResponse);
    return true; // 保持消息通道开放以支持异步响应
  }
});

// 处理获取releases的请求
async function handleFetchReleases(message, sendResponse) {
  try {
    const { owner, repo } = message;
    
    // 验证参数
    if (!owner || !repo) {
      console.error('GitHub Enhanced Downloader: 缺少必要的仓库信息', { owner, repo });
      sendResponse({ 
        success: false, 
        error: '缺少仓库信息' 
      });
      return;
    }
    
    console.log(`GitHub Enhanced Downloader: 开始获取 ${owner}/${repo} 的releases`);
    
    // 构建GitHub API URL
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
    
    // 4. 调用GitHub API
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub Enhanced Downloader Chrome Extension'
      }
    });
    
    // 4. 处理API响应
    if (!response.ok) {
      let errorMessage = '获取releases失败';
      
      if (response.status === 404) {
        errorMessage = '仓库未找到或没有发行版';
      } else if (response.status === 403) {
        errorMessage = 'API请求频率限制，请稍后重试';
      } else if (response.status >= 500) {
        errorMessage = 'GitHub服务器错误，请稍后重试';
      }
      
      console.error(`GitHub Enhanced Downloader: API请求失败 (${response.status})`, errorMessage);
      sendResponse({ 
        success: false, 
        error: errorMessage 
      });
      return;
    }
    
    const releasesData = await response.json();
    console.log(`GitHub Enhanced Downloader: 成功获取到 ${releasesData.length} 个releases`);
    
    // 5. 数据加工 - 处理并分组releases数据
    const groupedReleases = processReleasesData(releasesData);
    
    // 计算总的releases数量
    const totalReleases = groupedReleases.reduce((total, group) => total + group.releases.length, 0);
    
    // 6. 发送最终数据 - 发送分组后的数据
    sendResponse({
      success: true,
      data: groupedReleases,
      totalCount: totalReleases,
      groupCount: groupedReleases.length
    });
    
    console.log(`GitHub Enhanced Downloader: 数据处理完成，共 ${groupedReleases.length} 个版本组，${totalReleases} 个releases`);
    
  } catch (error) {
    console.error('GitHub Enhanced Downloader: 处理releases时发生错误', error);
    sendResponse({ 
      success: false, 
      error: `处理失败: ${error.message}` 
    });
  }
}

// 5. 数据加工函数
function processReleasesData(releasesData) {
  // 首先处理每个release，生成包含镜像链接的数据
  const processedReleases = releasesData.map(release => {
    // a. 创建简化的release对象
    const processedRelease = {
      name: release.name || release.tag_name,
      tag_name: release.tag_name,
      published_at: release.published_at,
      body: release.body || '',
      draft: release.draft,
      prerelease: release.prerelease,
      assets: []
    };
    
    // b. 遍历assets数组
    if (release.assets && Array.isArray(release.assets)) {
      processedRelease.assets = release.assets.map(asset => {
        // 创建简化的asset对象
        const processedAsset = {
          name: asset.name,
          size: asset.size,
          download_count: asset.download_count || 0,
          content_type: asset.content_type || '',
          download_links: []
        };
        
        // c. 创建download_links数组
        // 首先添加官方下载链接
        processedAsset.download_links.push({
          name: 'GitHub',
          url: asset.browser_download_url,
          type: 'official'
        });
        
        // 然后为每个镜像生成加速链接
        currentMirrors.forEach(mirror => {
          const mirrorUrl = generateMirrorUrl(asset.browser_download_url, mirror.rule);
          if (mirrorUrl) {
            processedAsset.download_links.push({
              name: mirror.name,
              url: mirrorUrl,
              type: 'mirror'
            });
          }
        });
        
        return processedAsset;
      });
    }
    
    return processedRelease;
  });

  // 1. 解析主版本号并创建分组数据结构
  const versionGroups = {};
  
  processedReleases.forEach(release => {
    const majorVersion = extractMajorVersion(release.tag_name);
    
    if (!versionGroups[majorVersion]) {
      versionGroups[majorVersion] = [];
    }
    
    versionGroups[majorVersion].push(release);
  });

  console.log('GitHub Enhanced Downloader: 版本分组结果', Object.keys(versionGroups));

  // 3. 排序和格式化
  const groupedArray = convertToSortedArray(versionGroups);
  
  console.log('GitHub Enhanced Downloader: 最终分组数据', groupedArray.map(g => ({ 
    groupName: g.groupName, 
    count: g.releases.length 
  })));

  return groupedArray;
}

// 1. 解析主版本号的函数
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

// 3. 将分组对象转换为有序数组的函数
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

// 格式化文件大小的辅助函数
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 启动时初始化
initializeMirrors();

console.log('GitHub Enhanced Downloader: 后台脚本已加载');
