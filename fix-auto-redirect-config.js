// 修复自动重定向默认启用问题的脚本
// 在浏览器控制台运行，清除现有配置并重置为正确的默认值

(function() {
  console.log('🔧 修复 GitHub Enhanced Downloader 自动重定向配置...');
  
  async function fixAutoRedirectConfig() {
    try {
      // 1. 清除现有的同步存储配置
      console.log('1. 清除现有配置...');
      await chrome.storage.sync.clear();
      
      // 2. 设置正确的默认配置（自动重定向默认禁用）
      console.log('2. 设置正确的默认配置...');
      const correctConfig = {
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
          enabled: false,  // 默认禁用，让用户主动选择
          preferredMirror: "KKGitHub",
          checkInterval: 300000
        }
      };
      
      await chrome.storage.sync.set({ mirrorConfig: correctConfig });
      
      // 3. 清除本地存储的网络状态（强制重新检测）
      console.log('3. 清除网络状态缓存...');
      await chrome.storage.local.remove('github_network_status');
      
      // 4. 验证配置
      console.log('4. 验证新配置...');
      const savedConfig = await chrome.storage.sync.get('mirrorConfig');
      console.log('保存的配置:', savedConfig.mirrorConfig);
      
      console.log('✅ 配置修复完成！');
      console.log('📝 变更内容:');
      console.log('  • 自动重定向默认设置: enabled: true → enabled: false');
      console.log('  • 用户现在需要主动在设置中启用自动重定向功能');
      console.log('  • 网络状态缓存已清除，将重新检测GitHub可访问性');
      
      // 5. 提醒用户刷新页面
      console.log('');
      console.log('⚠️  请刷新当前页面以应用新配置');
      console.log('💡 如需启用自动重定向，请在扩展设置中手动开启');
      
      return true;
      
    } catch (error) {
      console.error('❌ 配置修复失败:', error);
      return false;
    }
  }
  
  // 检查是否在扩展环境中
  if (typeof chrome !== 'undefined' && chrome.storage) {
    fixAutoRedirectConfig();
  } else {
    console.error('❌ 此脚本需要在Chrome扩展环境中运行');
    console.log('请在GitHub页面的控制台中运行此脚本');
  }
  
})();
