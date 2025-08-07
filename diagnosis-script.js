// GitHub Enhanced Downloader 诊断脚本
// 在浏览器控制台中运行此脚本来诊断问题

console.log('=== GitHub Enhanced Downloader 诊断开始 ===');

// 1. 检查扩展基本状态
console.log('1. 扩展基本状态检查:');
console.log('  chrome.runtime存在:', typeof chrome !== 'undefined' && chrome.runtime);
console.log('  chrome.runtime.id:', chrome.runtime?.id);
console.log('  扩展ID有效:', !!chrome.runtime?.id);

// 2. 检查DOM元素
console.log('2. DOM元素检查:');
const downloadBtn = document.getElementById('enhanced-downloader-btn');
console.log('  下载按钮存在:', !!downloadBtn);
if (downloadBtn) {
  console.log('  按钮文本:', downloadBtn.textContent);
  console.log('  按钮disabled:', downloadBtn.disabled);
  console.log('  按钮样式:', downloadBtn.style.cssText);
  console.log('  按钮事件监听器:', getEventListeners ? getEventListeners(downloadBtn) : '需要在DevTools中查看');
}

// 3. 检查页面信息
console.log('3. 页面信息检查:');
const currentUrl = window.location.href;
console.log('  当前URL:', currentUrl);
const pathParts = window.location.pathname.split('/').filter(Boolean);
console.log('  路径组件:', pathParts);
console.log('  是否为GitHub仓库页面:', pathParts.length >= 2 && window.location.hostname.includes('github'));

// 4. 提取仓库信息
console.log('4. 仓库信息提取:');
function testExtractRepoInfo() {
  const pathname = window.location.pathname;
  const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
  
  if (pathSegments.length >= 2) {
    return {
      owner: pathSegments[0],
      repo: pathSegments[1],
      pathSegments: pathSegments
    };
  }
  return null;
}
const repoInfo = testExtractRepoInfo();
console.log('  提取的仓库信息:', repoInfo);

// 5. 测试消息发送
console.log('5. 消息发送测试:');
if (chrome.runtime?.id && repoInfo) {
  console.log('  开始测试消息发送...');
  
  chrome.runtime.sendMessage({
    type: 'FETCH_RELEASES',
    owner: repoInfo.owner,
    repo: repoInfo.repo
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('  消息发送错误:', chrome.runtime.lastError);
    } else {
      console.log('  消息发送成功，响应:', response);
    }
  });
} else {
  console.log('  无法测试消息发送 - 扩展无效或仓库信息缺失');
}

// 6. 检查内容脚本变量
console.log('6. 内容脚本变量检查:');
console.log('  isButtonAdded:', typeof isButtonAdded !== 'undefined' ? isButtonAdded : '未定义');
console.log('  currentModal:', typeof currentModal !== 'undefined' ? currentModal : '未定义');
console.log('  extensionValid:', typeof extensionValid !== 'undefined' ? extensionValid : '未定义');

// 7. 模拟点击事件
console.log('7. 模拟点击测试:');
if (downloadBtn) {
  console.log('  手动触发点击事件...');
  
  // 创建点击事件
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  
  // 触发事件
  downloadBtn.dispatchEvent(clickEvent);
  console.log('  点击事件已触发');
} else {
  console.log('  无法模拟点击 - 按钮不存在');
}

console.log('=== GitHub Enhanced Downloader 诊断结束 ===');
console.log('请检查上述输出，查找可能的问题');

// 提供解决建议
console.log('\n=== 常见问题解决方案 ===');
console.log('1. 如果扩展ID无效: 重新加载扩展或刷新页面');
console.log('2. 如果按钮不存在: 检查页面是否为GitHub仓库页面');
console.log('3. 如果消息发送失败: 检查background.js是否正常运行');
console.log('4. 如果提取仓库信息失败: 检查URL格式是否正确');
