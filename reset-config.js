// 重置扩展配置脚本
// 在扩展的console中运行此脚本来重置配置

console.log('=== GitHub Enhanced Downloader 配置重置 ===');

// 清除所有存储的配置
chrome.storage.sync.clear(() => {
  console.log('✅ 所有配置已清除');
  
  // 设置默认镜像配置
  const defaultConfig = {
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
      enabled: true,
      preferredMirror: "KKGitHub",
      checkInterval: 300000
    }
  };

  chrome.storage.sync.set({ mirrorConfig: defaultConfig }, () => {
    console.log('✅ 默认镜像配置已设置');
    console.log('配置内容:', defaultConfig);
    
    // 验证配置是否正确保存
    chrome.storage.sync.get(['mirrorConfig'], (result) => {
      console.log('✅ 配置验证成功');
      console.log('保存的配置:', result.mirrorConfig);
      
      if (result.mirrorConfig && result.mirrorConfig.mirrors) {
        console.log(`启用的镜像站数量: ${result.mirrorConfig.mirrors.filter(m => m.enabled).length}`);
        result.mirrorConfig.mirrors.forEach(mirror => {
          console.log(`- ${mirror.name}: ${mirror.enabled ? '启用' : '禁用'} (${mirror.urlPattern})`);
        });
      }
      
      console.log('🎉 配置重置完成！请刷新GitHub页面并重新测试下载功能。');
    });
  });
});

// 提供手动运行的说明
console.log('📋 如果您看到此消息，请按以下步骤操作：');
console.log('1. 打开任意GitHub仓库页面');
console.log('2. 按F12打开开发者工具');
console.log('3. 切换到Console标签');
console.log('4. 复制并粘贴上述代码到console中运行');
console.log('5. 刷新页面并测试下载功能');
