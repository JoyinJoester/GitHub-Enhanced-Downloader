// 镜像转换测试
// Test script for mirror URL conversion

// 测试URL
const testUrl = "https://github.com/microsoft/vscode/releases/download/1.80.0/VSCode-win32-x64.zip";

// 新的镜像配置
const newMirrors = [
  {
    name: 'BGitHub',
    rule: 'https://bgithub.xyz${url.replace("https://github.com", "")}',
    description: 'BGitHub镜像加速服务'
  },
  {
    name: 'KKGitHub',
    rule: 'https://kkgithub.com${url.replace("https://github.com", "")}',
    description: 'KKGitHub镜像加速服务'
  },
  {
    name: 'GitFun',
    rule: 'https://github.ur1.fun${url.replace("https://github.com", "")}',
    description: 'GitFun镜像加速服务'
  }
];

// 测试函数
function generateMirrorUrl(originalUrl, rule) {
  try {
    if (rule.includes('${')) {
      // 模板字符串方式
      const url = originalUrl;
      const domain = new URL(originalUrl).hostname;
      const path = originalUrl.replace(/^https?:\/\/[^\/]+/, '');
      return eval(`\`${rule}\``);
    } else {
      // JavaScript表达式方式
      const url = originalUrl;
      return eval(rule);
    }
  } catch (error) {
    console.error('镜像URL生成失败:', error);
    return originalUrl;
  }
}

// 执行测试
console.log('=== 镜像转换测试 ===');
console.log('原始URL:', testUrl);
console.log('');

newMirrors.forEach(mirror => {
  const convertedUrl = generateMirrorUrl(testUrl, mirror.rule);
  console.log(`${mirror.name}:`);
  console.log(`  规则: ${mirror.rule}`);
  console.log(`  结果: ${convertedUrl}`);
  console.log(`  描述: ${mirror.description}`);
  console.log('');
});

console.log('=== 预期结果 ===');
console.log('BGitHub: https://bgithub.xyz/microsoft/vscode/releases/download/1.80.0/VSCode-win32-x64.zip');
console.log('KKGitHub: https://kkgithub.com/microsoft/vscode/releases/download/1.80.0/VSCode-win32-x64.zip');
console.log('GitFun: https://github.ur1.fun/microsoft/vscode/releases/download/1.80.0/VSCode-win32-x64.zip');
