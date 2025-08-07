// GitHub Enhanced Downloader - Popup Script

// 国际化函数
function initializeI18n() {
  // 获取所有带有 data-i18n 属性的元素
  const i18nElements = document.querySelectorAll('[data-i18n]');
  
  i18nElements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    
    if (message) {
      if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = message;
      } else {
        element.textContent = message;
      }
    }
  });
  
  // 设置文档标题
  document.title = chrome.i18n.getMessage('popupTitle');
}

// 默认镜像配置
const DEFAULT_MIRRORS = [
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
];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化国际化
  initializeI18n();
  await loadSettings();
  bindEvents();
});

// 加载设置
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['mirrorSettings', 'redirectSettings']);
    const settings = result.mirrorSettings || {
      presetMirrors: DEFAULT_MIRRORS,
      customMirrors: []
    };
    
    const redirectSettings = result.redirectSettings || {
      enabled: true,
      preferredMirror: 'KKGitHub',
      autoRedirect: true
    };
    
    renderPresetMirrors(settings.presetMirrors);
    renderCustomMirrors(settings.customMirrors);
    renderRedirectSettings(redirectSettings);
    
    // 加载网络状态
    await loadNetworkStatus();
    
    console.log('设置加载完成:', { settings, redirectSettings });
  } catch (error) {
    console.error('加载设置失败:', error);
    showMessage('加载设置失败: ' + error.message, 'error');
  }
}

// 渲染预设镜像
function renderPresetMirrors(presetMirrors) {
  const container = document.getElementById('preset-mirrors');
  container.innerHTML = '';
  
  presetMirrors.forEach((mirror, index) => {
    const item = document.createElement('div');
    item.className = 'mirror-item';
    
    item.innerHTML = `
      <input type="checkbox" 
             class="mirror-checkbox" 
             id="preset-${index}" 
             ${mirror.enabled ? 'checked' : ''}>
      <label for="preset-${index}" class="mirror-name">${mirror.name}</label>
      <div class="mirror-url">${mirror.description}</div>
    `;
    
    const checkbox = item.querySelector('.mirror-checkbox');
    checkbox.addEventListener('change', (e) => {
      updatePresetMirrorStatus(index, e.target.checked);
    });
    
    container.appendChild(item);
  });
}

// 渲染自定义镜像
function renderCustomMirrors(customMirrors) {
  const container = document.getElementById('custom-mirrors');
  container.innerHTML = '';
  
  if (customMirrors.length === 0) {
    container.innerHTML = '<div style="color: #656d76; text-align: center; padding: 20px;">暂无自定义镜像</div>';
    return;
  }
  
  customMirrors.forEach((mirror, index) => {
    const item = document.createElement('div');
    item.className = 'mirror-item';
    
    item.innerHTML = `
      <input type="checkbox" 
             class="mirror-checkbox" 
             id="custom-${index}" 
             ${mirror.enabled ? 'checked' : ''}>
      <label for="custom-${index}" class="mirror-name">${mirror.name}</label>
      <div class="mirror-url">${mirror.rule}</div>
      <button class="btn btn-danger" style="margin-left: 8px; padding: 4px 8px; font-size: 12px;" 
              onclick="removeCustomMirror(${index})">删除</button>
    `;
    
    const checkbox = item.querySelector('.mirror-checkbox');
    checkbox.addEventListener('change', (e) => {
      updateCustomMirrorStatus(index, e.target.checked);
    });
    
    container.appendChild(item);
  });
}

// 渲染重定向设置
function renderRedirectSettings(redirectSettings) {
  const autoRedirectCheckbox = document.getElementById('auto-redirect-enabled');
  const preferredMirrorSelect = document.getElementById('preferred-mirror');
  
  autoRedirectCheckbox.checked = redirectSettings.enabled || false;
  preferredMirrorSelect.value = redirectSettings.preferredMirror || 'KKGitHub';
  
  // 绑定事件
  autoRedirectCheckbox.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await updateRedirectSettings({ enabled });
  });
  
  preferredMirrorSelect.addEventListener('change', async (e) => {
    const preferredMirror = e.target.value;
    await updateRedirectSettings({ preferredMirror });
  });
}

// 加载网络状态
async function loadNetworkStatus() {
  try {
    const result = await chrome.storage.local.get(['githubAccessible', 'lastCheckTime']);
    const statusElement = document.getElementById('network-status');
    const statusText = document.getElementById('network-status-text');
    
    if (result.githubAccessible !== undefined) {
      const accessible = result.githubAccessible;
      const lastCheck = result.lastCheckTime ? new Date(result.lastCheckTime).toLocaleTimeString() : '未知';
      
      statusElement.style.display = 'block';
      if (accessible) {
        statusElement.className = 'status-message status-success';
        statusText.textContent = `✅ GitHub可正常访问 (最后检测: ${lastCheck})`;
      } else {
        statusElement.className = 'status-message status-error';
        statusText.textContent = `❌ GitHub无法访问，已启用镜像重定向 (最后检测: ${lastCheck})`;
      }
    }
  } catch (error) {
    console.error('加载网络状态失败:', error);
  }
}

// 更新重定向设置
async function updateRedirectSettings(updates) {
  try {
    const result = await chrome.storage.sync.get(['redirectSettings']);
    const currentSettings = result.redirectSettings || {
      enabled: true,
      preferredMirror: 'KKGitHub',
      autoRedirect: true
    };
    
    const newSettings = { ...currentSettings, ...updates };
    await chrome.storage.sync.set({ redirectSettings: newSettings });
    
    console.log('重定向设置已更新:', newSettings);
  } catch (error) {
    console.error('更新重定向设置失败:', error);
    showMessage('保存设置失败: ' + error.message, 'error');
  }
}

// 绑定事件
function bindEvents() {
  // 添加镜像
  document.getElementById('add-mirror').addEventListener('click', addCustomMirror);
  
  // 测试规则
  document.getElementById('test-mirror').addEventListener('click', testMirrorRule);
  
  // 保存设置
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  
  // 重置设置
  document.getElementById('reset-settings').addEventListener('click', resetSettings);
  
  // 回车键添加镜像
  document.getElementById('mirror-rule').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCustomMirror();
    }
  });
}

// 更新预设镜像状态
async function updatePresetMirrorStatus(index, enabled) {
  try {
    const result = await chrome.storage.sync.get(['mirrorSettings']);
    const settings = result.mirrorSettings || { presetMirrors: DEFAULT_MIRRORS, customMirrors: [] };
    
    settings.presetMirrors[index].enabled = enabled;
    
    await chrome.storage.sync.set({ mirrorSettings: settings });
    console.log(`预设镜像 ${settings.presetMirrors[index].name} 状态更新为:`, enabled);
  } catch (error) {
    console.error('更新预设镜像状态失败:', error);
    showMessage('更新失败: ' + error.message, 'error');
  }
}

// 更新自定义镜像状态
async function updateCustomMirrorStatus(index, enabled) {
  try {
    const result = await chrome.storage.sync.get(['mirrorSettings']);
    const settings = result.mirrorSettings || { presetMirrors: DEFAULT_MIRRORS, customMirrors: [] };
    
    settings.customMirrors[index].enabled = enabled;
    
    await chrome.storage.sync.set({ mirrorSettings: settings });
    console.log(`自定义镜像 ${settings.customMirrors[index].name} 状态更新为:`, enabled);
  } catch (error) {
    console.error('更新自定义镜像状态失败:', error);
    showMessage('更新失败: ' + error.message, 'error');
  }
}

// 添加自定义镜像
async function addCustomMirror() {
  const nameInput = document.getElementById('mirror-name');
  const ruleInput = document.getElementById('mirror-rule');
  
  const name = nameInput.value.trim();
  const rule = ruleInput.value.trim();
  
  if (!name || !rule) {
    showMessage('请填写镜像名称和URL规则', 'error');
    return;
  }
  
  // 验证规则格式
  if (!rule.includes('${url}') && !rule.includes('${domain}') && !rule.includes('${path}')) {
    showMessage('URL规则必须包含 ${url}、${domain} 或 ${path} 占位符', 'error');
    return;
  }
  
  try {
    const result = await chrome.storage.sync.get(['mirrorSettings']);
    const settings = result.mirrorSettings || { presetMirrors: DEFAULT_MIRRORS, customMirrors: [] };
    
    // 检查是否已存在同名镜像
    const exists = settings.customMirrors.some(mirror => mirror.name === name);
    if (exists) {
      showMessage('已存在同名镜像，请使用不同的名称', 'error');
      return;
    }
    
    const newMirror = {
      name: name,
      rule: rule,
      enabled: true,
      type: 'custom'
    };
    
    settings.customMirrors.push(newMirror);
    
    await chrome.storage.sync.set({ mirrorSettings: settings });
    
    // 清空输入框
    nameInput.value = '';
    ruleInput.value = '';
    
    // 重新渲染
    renderCustomMirrors(settings.customMirrors);
    
    showMessage('自定义镜像添加成功', 'success');
    
  } catch (error) {
    console.error('添加自定义镜像失败:', error);
    showMessage('添加失败: ' + error.message, 'error');
  }
}

// 删除自定义镜像
async function removeCustomMirror(index) {
  if (!confirm('确定要删除这个自定义镜像吗？')) {
    return;
  }
  
  try {
    const result = await chrome.storage.sync.get(['mirrorSettings']);
    const settings = result.mirrorSettings || { presetMirrors: DEFAULT_MIRRORS, customMirrors: [] };
    
    settings.customMirrors.splice(index, 1);
    
    await chrome.storage.sync.set({ mirrorSettings: settings });
    
    renderCustomMirrors(settings.customMirrors);
    
    showMessage('自定义镜像删除成功', 'success');
    
  } catch (error) {
    console.error('删除自定义镜像失败:', error);
    showMessage('删除失败: ' + error.message, 'error');
  }
}

// 测试镜像规则
function testMirrorRule() {
  const rule = document.getElementById('mirror-rule').value.trim();
  
  if (!rule) {
    showMessage('请输入URL规则', 'error');
    return;
  }
  
  // 测试URL
  const testUrl = 'https://github.com/microsoft/vscode/releases/download/1.85.0/VSCode-win32-x64-1.85.0.zip';
  
  try {
    let result;
    
    if (rule.includes('${url}')) {
      result = rule.replace(/\$\{url\}/g, testUrl);
    } else if (rule.includes('.replace(')) {
      // 处理JavaScript表达式
      const urlVar = testUrl;
      result = eval(rule.replace(/\$\{url\}/g, 'urlVar'));
    } else {
      // 处理其他占位符
      const url = new URL(testUrl);
      result = rule
        .replace(/\$\{domain\}/g, url.hostname)
        .replace(/\$\{path\}/g, url.pathname)
        .replace(/\$\{protocol\}/g, url.protocol);
    }
    
    showMessage(`测试结果: ${result}`, 'success');
    
  } catch (error) {
    showMessage(`规则测试失败: ${error.message}`, 'error');
  }
}

// 保存设置
async function saveSettings() {
  try {
    const result = await chrome.storage.sync.get(['mirrorSettings']);
    const settings = result.mirrorSettings;
    
    if (!settings) {
      showMessage('没有设置需要保存', 'error');
      return;
    }
    
    // 重新保存确保数据一致性
    await chrome.storage.sync.set({ mirrorSettings: settings });
    
    showMessage('设置保存成功', 'success');
    
    // 通知background script重新加载镜像配置
    chrome.runtime.sendMessage({ type: 'RELOAD_MIRRORS' });
    
  } catch (error) {
    console.error('保存设置失败:', error);
    showMessage('保存失败: ' + error.message, 'error');
  }
}

// 重置设置
async function resetSettings() {
  if (!confirm('确定要重置为默认设置吗？这将删除所有自定义镜像。')) {
    return;
  }
  
  try {
    const defaultSettings = {
      presetMirrors: DEFAULT_MIRRORS,
      customMirrors: []
    };
    
    await chrome.storage.sync.set({ mirrorSettings: defaultSettings });
    
    renderPresetMirrors(defaultSettings.presetMirrors);
    renderCustomMirrors(defaultSettings.customMirrors);
    
    showMessage('设置已重置为默认', 'success');
    
    // 通知background script重新加载镜像配置
    chrome.runtime.sendMessage({ type: 'RELOAD_MIRRORS' });
    
  } catch (error) {
    console.error('重置设置失败:', error);
    showMessage('重置失败: ' + error.message, 'error');
  }
}

// 显示消息
function showMessage(message, type = 'success') {
  const container = document.getElementById('status-message');
  container.className = `status-message status-${type}`;
  container.textContent = message;
  container.style.display = 'block';
  
  // 3秒后自动隐藏
  setTimeout(() => {
    container.style.display = 'none';
  }, 3000);
}

// 使函数全局可用
window.removeCustomMirror = removeCustomMirror;
