// Vercel 환경에서 Playwright 사용을 위한 설정
// 이 파일은 Vercel에서 Playwright 브라우저를 찾을 수 있도록 도와줍니다

import { chromium } from 'playwright';

// Vercel 환경에서는 브라우저 실행이 제한적이므로
// 필요한 경우에만 브라우저를 시작하도록 설정
export const getBrowser = async () => {
  try {
    // Vercel 환경에서는 headless 모드로만 실행
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    return browser;
  } catch (error) {
    console.warn('Browser launch failed in Vercel environment:', error.message);
    // Vercel 환경에서는 브라우저 실행이 제한적일 수 있음
    return null;
  }
};

export const isVercelEnvironment = () => {
  return process.env.VERCEL === '1';
};
