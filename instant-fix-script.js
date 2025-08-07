// GitHub Enhanced Downloader 即时修复脚本
// 在GitHub仓库页面的浏览器控制台中粘贴并运行此脚本

(function() {
  console.log('🔧 GitHub Enhanced Downloader 即时修复脚本启动...');
  
  // 1. 检查并修复扩展上下文
  function checkAndFixExtensionContext() {
    console.log('1. 检查扩展上下文...');
    
    if (!chrome || !chrome.runtime) {
      console.error('❌ Chrome扩展API不可用');
      return false;
    }
    
    if (!chrome.runtime.id) {
      console.error('❌ 扩展上下文已失效，需要刷新页面');
      alert('扩展需要刷新页面才能正常工作，点击确定刷新页面');
      window.location.reload();
      return false;
    }
    
    console.log('✅ 扩展上下文正常');
    return true;
  }
  
  // 2. 检查并重新注入下载按钮
  function checkAndReinjectButton() {
    console.log('2. 检查下载按钮...');
    
    const existingButton = document.getElementById('enhanced-downloader-btn');
    if (existingButton) {
      console.log('✅ 下载按钮已存在');
      
      // 检查按钮是否有事件监听器
      const hasClickHandler = existingButton.onclick || 
        (getEventListeners && getEventListeners(existingButton).click?.length > 0);
      
      if (!hasClickHandler) {
        console.log('⚠️ 按钮缺少点击事件，重新添加...');
        existingButton.addEventListener('click', createClickHandler());
        console.log('✅ 点击事件已重新添加');
      }
      
      return existingButton;
    }
    
    console.log('⚠️ 下载按钮不存在，尝试重新注入...');
    return reinjectDownloadButton();
  }
  
  // 3. 重新注入下载按钮
  function reinjectDownloadButton() {
    console.log('3. 重新注入下载按钮...');
    
    // 查找合适的插入位置
    const selectors = [
      'h1[data-pjax="#js-repo-pjax-container"] strong a',
      '.AppHeader-context-item',
      '.pagehead-actions',
      '.BorderGrid-row .BorderGrid-cell:first-child h2'
    ];
    
    let insertTarget = null;
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        insertTarget = element.parentElement;
        break;
      }
    }
    
    if (!insertTarget) {
      console.error('❌ 未找到合适的按钮插入位置');
      return null;
    }
    
    // 创建下载按钮
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'enhanced-downloader-btn';
    downloadBtn.textContent = '🚀 下载发行版';
    downloadBtn.style.cssText = `
      margin-left: 8px;
      padding: 6px 12px;
      background-color: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      color: #24292f;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
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
    
    // 添加点击事件
    downloadBtn.addEventListener('click', createClickHandler());
    
    // 插入按钮
    insertTarget.appendChild(downloadBtn);
    console.log('✅ 下载按钮已重新注入');
    
    return downloadBtn;
  }
  
  // 4. 创建点击事件处理器
  function createClickHandler() {
    return async function(event) {
      event.preventDefault();
      console.log('🔄 处理下载按钮点击...');
      
      const button = event.target;
      const originalText = button.textContent;
      
      try {
        // 显示加载状态
        button.textContent = '⏳ 加载中...';
        button.disabled = true;
        button.style.opacity = '0.6';
        
        // 提取仓库信息
        const repoInfo = extractRepoInfo();
        if (!repoInfo) {
          throw new Error('无法从URL中提取仓库信息');
        }
        
        console.log('📦 仓库信息:', repoInfo);
        
        // 发送消息到后台脚本
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('请求超时'));
          }, 15000);
          
          chrome.runtime.sendMessage({
            type: 'FETCH_RELEASES',
            owner: repoInfo.owner,
            repo: repoInfo.repo
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
        
        // 恢复按钮状态
        button.textContent = originalText;
        button.disabled = false;
        button.style.opacity = '1';
        
        // 处理响应
        if (response.success) {
          console.log('✅ 成功获取发行版数据');
          console.log('📊 数据统计:', {
            总发行版数: response.totalCount,
            分组数: response.groupCount
          });
          
          // 这里应该调用showReleasesModal，但我们只是简单显示成功消息
          alert(`成功获取 ${response.totalCount} 个发行版数据！\n分为 ${response.groupCount} 个分组。\n\n请检查控制台查看详细数据。`);
          console.log('📋 发行版数据:', response.data);
        } else {
          throw new Error(response.error || '获取发行版数据失败');
        }
        
      } catch (error) {
        // 恢复按钮状态
        button.textContent = originalText;
        button.disabled = false;
        button.style.opacity = '1';
        
        console.error('❌ 处理失败:', error);
        alert('操作失败: ' + error.message);
      }
    };
  }
  
  // 5. 提取仓库信息
  function extractRepoInfo() {
    const pathname = window.location.pathname;
    const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
    
    if (pathSegments.length >= 2) {
      return {
        owner: pathSegments[0],
        repo: pathSegments[1]
      };
    }
    
    return null;
  }
  
  // 6. 检查是否为GitHub仓库页面
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
  
  // 主修复流程
  function runFix() {
    console.log('🚀 开始修复流程...');
    
    // 检查页面类型
    if (!isGitHubRepoPage()) {
      console.error('❌ 当前不是GitHub仓库页面');
      alert('请在GitHub仓库页面运行此脚本');
      return;
    }
    
    // 检查扩展上下文
    if (!checkAndFixExtensionContext()) {
      return;
    }
    
    // 检查并修复按钮
    const button = checkAndReinjectButton();
    if (button) {
      console.log('✅ 修复完成！可以尝试点击下载按钮');
      
      // 高亮按钮3秒
      const originalStyle = button.style.cssText;
      button.style.outline = '3px solid #0969da';
      button.style.outlineOffset = '2px';
      
      setTimeout(() => {
        button.style.cssText = originalStyle;
      }, 3000);
      
    } else {
      console.error('❌ 无法修复下载按钮');
    }
  }
  
  // 执行修复
  runFix();
  
  // 提供手动触发修复的全局函数
  window.fixDownloader = runFix;
  console.log('💡 提示: 如需再次运行修复，在控制台输入 fixDownloader()');
  
})();
