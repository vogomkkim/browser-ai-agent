import { chromium } from 'playwright';

// 전역 브라우저 인스턴스 관리
let activeBrowser = null;
let activePage = null;

export async function runBrowserAutomation(commands) {
  // 이미 브라우저가 열려있다면 기존 페이지 사용
  if (activeBrowser && activePage) {
    console.log('🌐 Using existing browser session...');
  } else {
    // 새 브라우저 시작
    activeBrowser = await chromium.launch({
      headless: process.env.BROWSER_HEADLESS === 'true' ? true : false
    });
    activePage = await activeBrowser.newPage();
    console.log('🚀 New browser session started');
  }

  const logs = [];
  const executionSummary = {
    total: commands.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    commands: []
  };
  const startTime = Date.now();

  try {
    // 뷰포트 설정
    const viewportWidth = parseInt(process.env.BROWSER_VIEWPORT_WIDTH) || 1280;
    const viewportHeight = parseInt(process.env.BROWSER_VIEWPORT_HEIGHT) || 720;
    await activePage.setViewportSize({ width: viewportWidth, height: viewportHeight });

    console.log(`📋 Executing ${commands.length} commands step by step...`);

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      const stepNumber = i + 1;
      
      try {
        console.log(`\n🔄 Step ${stepNumber}/${commands.length}: ${cmd.description}`);
        
        // 동적 탐색이 필요한 명령어인지 확인
        if (cmd.action === 'click' && cmd.requiresDynamicSearch) {
          console.log('🔍 Dynamic element search required...');
          const dynamicResult = await executeDynamicClick(activePage, cmd);
          logs.push(dynamicResult);
          
          // 성공한 명령어 기록
          executionSummary.commands.push({
            step: stepNumber,
            action: cmd.action,
            description: cmd.description,
            status: 'success',
            result: dynamicResult,
            timestamp: new Date().toISOString()
          });
          
          executionSummary.successful++;
          console.log(`✅ Step ${stepNumber} completed: ${dynamicResult}`);
        } else {
          const log = await executeCommand(activePage, cmd);
          logs.push(log);
          
          // 성공한 명령어 기록
          executionSummary.commands.push({
            step: stepNumber,
            action: cmd.action,
            description: cmd.description,
            status: 'success',
            result: log,
            timestamp: new Date().toISOString()
          });
          
          executionSummary.successful++;
          console.log(`✅ Step ${stepNumber} completed: ${log}`);
        }

        // 명령어 실행 후 잠시 대기 (필요한 경우)
        if (cmd.delay) {
          console.log(`⏱️  Waiting for ${cmd.delay}ms...`);
          await activePage.waitForTimeout(cmd.delay);
        }

        // 복잡한 명령어 후 추가 검증
        if (cmd.action === 'click' && cmd.selector && cmd.selector.includes('sid1')) {
          console.log('🔍 Verifying navigation result...');
          await verifyNavigation(activePage, cmd);
        }

      } catch (error) {
        const errorMsg = `Error executing command ${stepNumber}: ${cmd.action} - ${error.message}`;
        logs.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
        
        // 실패한 명령어 기록
        executionSummary.commands.push({
          step: stepNumber,
          action: cmd.action,
          description: cmd.description,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        executionSummary.failed++;
        
        // 에러 발생시 다음 단계로 진행할지 결정
        if (shouldContinueAfterError(cmd, error)) {
          console.log('⚠️  Continuing to next step despite error...');
        } else {
          throw error; // 치명적 에러면 중단
        }
      }
    }

    const executionTime = Date.now() - startTime;

    // 🔥 실행 결과 요약 출력 (성공/실패 명령어 모두 포함)
    console.log('\n📊 Execution Summary:');
    console.log(`📋 Total Commands: ${executionSummary.total}`);
    console.log(`✅ Successful: ${executionSummary.successful}`);
    console.log(`❌ Failed: ${executionSummary.failed}`);
    console.log(`⏭️ Skipped: ${executionSummary.skipped}`);
    
    if (executionSummary.failed > 0) {
      console.log('\n❌ Failed Commands:');
      executionSummary.commands
        .filter(cmd => cmd.status === 'failed')
        .forEach(cmd => {
          console.log(`  Step ${cmd.step}: ${cmd.action} - ${cmd.error}`);
        });
    }
    
    console.log('\n✅ Successful Commands:');
    executionSummary.commands
      .filter(cmd => cmd.status === 'success')
      .forEach(cmd => {
        console.log(`  Step ${cmd.step}: ${cmd.action} - ${cmd.description}`);
      });

    // 브라우저를 열린 상태로 유지
    console.log('\n🌐 Browser automation completed successfully!');
    console.log('💡 Browser will remain open for continuous automation.');
    console.log('🔒 To close browser, use the /close-browser endpoint.');

    return {
      success: true,
      logs,
      executionTime,
      modelUsed: commands.modelUsed || 'unknown',
      browserStatus: 'open',
      message: 'Browser remains open for continuous automation',
      stepsExecuted: commands.length,
      executionDetails: {
        totalSteps: commands.length,
        successfulSteps: executionSummary.successful,
        failedSteps: executionSummary.failed,
        skippedSteps: executionSummary.skipped
      },
      // 🔥 새로운 필드: 완전한 실행 요약
      executionSummary: executionSummary
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.log('\n❌ Error occurred during automation.');
    console.log('🌐 Browser remains open for debugging.');

    // 🔥 실패한 명령어들도 포함해서 반환
    return {
      success: false,
      logs: [...logs, `Fatal error: ${error.message}`],
      error: error.message,
      executionTime,
      modelUsed: commands.modelUsed || 'unknown',
      browserStatus: 'open',
      message: 'Browser remains open for debugging',
      stepsExecuted: logs.filter(log => !log.includes('Error')).length,
      executionDetails: {
        totalSteps: commands.length,
        successfulSteps: executionSummary.successful,
        failedSteps: executionSummary.failed + 1, // +1 for fatal error
        skippedSteps: executionSummary.skipped
      },
      // 🔥 새로운 필드: 완전한 실행 요약 (실패 포함)
      executionSummary: executionSummary
    };
  }
}

// 동적 클릭 실행 (페이지를 읽어서 요소를 찾음)
async function executeDynamicClick(page, cmd) {
  try {
    console.log('📖 Reading page content to identify elements...');
    
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');
    
    // 페이지 내용 분석
    const pageInfo = await analyzePageContent(page);
    // console.log('🔍 Page analysis completed:', pageInfo);
    
    // 목표 요소 찾기
    const targetElement = await findTargetElement(page, cmd, pageInfo);
    
    if (targetElement) {
      console.log(`🎯 Target element found: ${targetElement.description}`);
      
      // 요소 클릭
      await targetElement.element.click();
      
      return `✅ ${cmd.description} - ${targetElement.description}`;
    } else {
      throw new Error('Target element not found on page');
    }
    
  } catch (error) {
    throw new Error(`Dynamic click failed: ${error.message}`);
  }
}

// 페이지 내용 분석
async function analyzePageContent(page) {
  try {
    // 페이지 제목
    const title = await page.title();
    
    // 모든 링크와 버튼 정보 수집
    const elements = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, [role="tab"], [role="button"]'));
      return links.map((el, index) => ({
        index,
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim() || '',
        href: el.href || '',
        className: el.className || '',
        id: el.id || '',
        role: el.getAttribute('role') || '',
        visible: el.offsetWidth > 0 && el.offsetHeight > 0
      })).filter(el => el.visible && el.text.length > 0);
    });
    
    return {
      title,
      elements,
      url: page.url()
    };
    
  } catch (error) {
    console.error('Page analysis failed:', error);
    return { title: '', elements: [], url: page.url() };
  }
}

// 목표 요소 찾기
async function findTargetElement(page, cmd, pageInfo) {
  const targetText = cmd.targetText || 'IT';
  const targetCategory = cmd.targetCategory || '뉴스';
  
  console.log(`🔍 Looking for element with text: "${targetText}" in category: "${targetCategory}"`);
  
  // 텍스트 기반 검색
  const textMatches = pageInfo.elements.filter(el => 
    el.text.toLowerCase().includes(targetText.toLowerCase()) ||
    el.text.toLowerCase().includes(targetCategory.toLowerCase())
  );
  
  if (textMatches.length > 0) {
    console.log(`📋 Found ${textMatches.length} text matches:`, textMatches.map(el => el.text));
    
    // 가장 적합한 요소 선택
    const bestMatch = textMatches.reduce((best, current) => {
      const currentScore = calculateRelevanceScore(current, targetText, targetCategory);
      const bestScore = calculateRelevanceScore(best, targetText, targetCategory);
      return currentScore > bestScore ? current : best;
    });
    
    // 요소 객체 반환
    const element = await page.locator(`a, button, [role="tab"], [role="button"]`).nth(bestMatch.index);
    
    return {
      element,
      description: `Found "${bestMatch.text}" (${bestMatch.tag})`,
      score: calculateRelevanceScore(bestMatch, targetText, targetCategory)
    };
  }
  
  // 텍스트 매치가 없으면 href 기반 검색
  const hrefMatches = pageInfo.elements.filter(el => 
    el.href && el.href.includes('sid1=105')
  );
  
  if (hrefMatches.length > 0) {
    console.log(`🔗 Found ${hrefMatches.length} href matches`);
    const element = await page.locator(`a, button, [role="tab"], [role="button"]`).nth(hrefMatches[0].index);
    
    return {
      element,
      description: `Found by href pattern: ${hrefMatches[0].href}`,
      score: 0.8
    };
  }
  
  return null;
}

// 요소 관련성 점수 계산
function calculateRelevanceScore(element, targetText, targetCategory) {
  let score = 0;
  
  // 텍스트 매칭 점수
  if (element.text.toLowerCase().includes(targetText.toLowerCase())) {
    score += 0.6;
  }
  if (element.text.toLowerCase().includes(targetCategory.toLowerCase())) {
    score += 0.4;
  }
  
  // 역할 기반 점수
  if (element.role === 'tab') score += 0.3;
  if (element.role === 'button') score += 0.2;
  
  // 태그 기반 점수
  if (element.tag === 'a') score += 0.2;
  if (element.tag === 'button') score += 0.1;
  
  return score;
}

// 네비게이션 결과 검증
async function verifyNavigation(page, cmd) {
  try {
    // URL 변경 확인
    const currentUrl = page.url();
    if (cmd.selector.includes('sid1=105')) {
      // IT 뉴스 페이지인지 확인
      const title = await page.title();
      if (title.includes('IT') || title.includes('과학') || currentUrl.includes('sid1=105')) {
        console.log('✅ Navigation verification successful: IT news page loaded');
      } else {
        console.log('⚠️  Navigation verification: Page loaded but may not be IT news');
      }
    }
  } catch (error) {
    console.log('⚠️  Navigation verification failed:', error.message);
  }
}

// 에러 후 계속 진행할지 결정
function shouldContinueAfterError(cmd, error) {
  // 클릭 실패나 대기 실패는 계속 진행
  if (cmd.action === 'click' || cmd.action === 'wait') {
    return true;
  }
  
  // 페이지 이동 실패는 중단
  if (cmd.action === 'goto') {
    return false;
  }
  
  return true;
}

// 브라우저 수동 종료 함수
export async function closeBrowser() {
  if (activeBrowser) {
    try {
      await activeBrowser.close();
      activeBrowser = null;
      activePage = null;
      console.log('🔒 Browser closed successfully');
      return { success: true, message: 'Browser closed successfully' };
    } catch (error) {
      console.error('Error closing browser:', error);
      return { success: false, error: error.message };
    }
  } else {
    return { success: false, message: 'No active browser session' };
  }
}

// 브라우저 상태 확인 함수
export function getBrowserStatus() {
  return {
    isOpen: !!activeBrowser,
    hasPage: !!activePage,
    timestamp: new Date().toISOString()
  };
}

async function executeCommand(page, cmd) {
  const { action, description } = cmd;

  switch (action) {
    case 'goto':
      await page.goto(cmd.url);
      return `✅ ${description || `Navigated to ${cmd.url}`}`;

    case 'type':
      await page.fill(cmd.selector, cmd.value);
      return `✅ ${description || `Typed "${cmd.value}" in ${cmd.selector}`}`;

    case 'press':
      await page.press(cmd.selector, cmd.key);
      return `✅ ${description || `Pressed ${cmd.key} on ${cmd.selector}`}`;

    case 'click':
      await page.click(cmd.selector);
      return `✅ ${description || `Clicked on ${cmd.selector}`}`;

    case 'wait':
      await page.waitForTimeout(cmd.delay || 1000);
      return `✅ ${description || `Waited for ${cmd.delay || 1000}ms`}`;

    case 'screenshot':
      const screenshotPath = `screenshots/screenshot_${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath });
      return `✅ ${description || `Screenshot saved to ${screenshotPath}`}`;

    case 'scroll':
      const direction = cmd.direction || 'down';
      if (direction === 'down') {
        await page.evaluate(() => window.scrollBy(0, 500));
      } else if (direction === 'up') {
        await page.evaluate(() => window.scrollBy(0, -500));
      }
      return `✅ ${description || `Scrolled ${direction}`}`;

    case 'extractText':
      if (!cmd.selector) throw new Error(`Command ${index}: 'extractText' requires 'selector' field`);
      const extractedText = await page.textContent(cmd.selector);
      return `✅ ${description || `Extracted text from ${cmd.selector}: "${extractedText}"`}`;

    case 'analyzeContent':
      const analysis = await analyzeNewsContent(page, cmd);
      return `✅ ${description || `Analyzed page content: ${JSON.stringify(analysis)}`}`;

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// 뉴스 콘텐츠 분석 및 헤드라인 추출 함수
async function analyzeNewsContent(page, cmd) {
  console.log('📰 Analyzing news content for headlines...');
  
  try {
    // 🔍 1단계: 페이지의 시각적 구역별로 뉴스 추출
    const sectionNews = await page.$$eval('*', (elements) => {
      const sections = {};
      
      // 주요 뉴스 구역들 식별 (네이버 뉴스 구조에 맞춤)
      elements.forEach(el => {
        const className = el.className || '';
        const id = el.id || '';
        const text = el.textContent?.trim() || '';
        
        // 메인 뉴스 영역 (상단 주요 뉴스)
        if (className.includes('main') || className.includes('headline') || className.includes('featured') || 
            className.includes('cni_news_area') || className.includes('cnf_news_area') || 
            id.includes('main') || id.includes('headline')) {
          if (!sections.mainNews) sections.mainNews = [];
          const links = el.querySelectorAll('a');
          links.forEach(link => {
            if (link.textContent?.trim().length > 10) {
              sections.mainNews.push({
                text: link.textContent.trim(),
                href: link.href,
                section: 'main'
              });
            }
          });
        }
        
        // 사이드바 뉴스 영역 (인기/트렌딩 뉴스)
        if (className.includes('side') || className.includes('popular') || className.includes('trending') ||
            className.includes('cni_news') || className.includes('cnf_news') ||
            id.includes('side') || id.includes('popular')) {
          if (!sections.sidebarNews) sections.sidebarNews = [];
          const links = el.querySelectorAll('a');
          links.forEach(link => {
            if (link.textContent?.trim().length > 10) {
              sections.sidebarNews.push({
                text: link.textContent.trim(),
                href: link.href,
                section: 'sidebar'
              });
            }
          });
        }
        
        // 언론사별 뉴스 영역
        if (className.includes('press') || className.includes('journal') || className.includes('media') ||
            className.includes('cnf_journal') || className.includes('cc_link_channel') ||
            id.includes('press') || id.includes('journal')) {
          if (!sections.pressNews) sections.pressNews = [];
          const links = el.querySelectorAll('a');
          links.forEach(link => {
            if (link.textContent?.trim().length > 10) {
              sections.pressNews.push({
                text: link.textContent.trim(),
                href: link.href,
                section: 'press'
              });
            }
          });
        }
        
        // 이슈/특집 뉴스 영역
        if (className.includes('issue') || className.includes('special') || className.includes('focus') ||
            className.includes('cni_issue_area') || className.includes('special_report') ||
            id.includes('issue') || id.includes('special')) {
          if (!sections.issueNews) sections.issueNews = [];
          const links = el.querySelectorAll('a');
          links.forEach(link => {
            if (link.textContent?.trim().length > 10) {
              sections.issueNews.push({
                text: link.textContent.trim(),
                href: link.href,
                section: 'issue'
              });
            }
          });
        }
      });
      
      return sections;
    });

    console.log('🔍 Found news sections:', Object.keys(sectionNews));
    
    // 🔍 2단계: 각 구역에서 대표 뉴스 1-2개씩 추출
    const representativeNews = {};
    Object.keys(sectionNews).forEach(section => {
      if (sectionNews[section] && sectionNews[section].length > 0) {
        // 각 구역에서 상위 2개만 추출
        representativeNews[section] = sectionNews[section].slice(0, 2);
      }
    });

    console.log('📋 Representative news by section:', Object.keys(representativeNews));
    
    // 🔍 3단계: 전체 뉴스 통계 및 요약
    const totalNews = Object.values(sectionNews).flat().length;
    const sectionCounts = {};
    Object.keys(sectionNews).forEach(section => {
      sectionCounts[section] = sectionNews[section]?.length || 0;
    });

    // 🔍 4단계: AI 기반 분류를 위한 뉴스 텍스트 준비
    const allNewsTexts = Object.values(representativeNews).flat().map(news => news.text);
    
    // 분석 결과 구성
    const analysis = {
      totalNews: totalNews,
      sections: Object.keys(sectionNews),
      sectionCounts: sectionCounts,
      representativeNews: representativeNews,
      allNewsTexts: allNewsTexts,
      summary: `총 ${totalNews}개의 뉴스를 ${Object.keys(sectionNews).length}개 구역에서 찾았습니다. 각 구역별 대표 뉴스를 추출했습니다.`,
      timestamp: new Date().toISOString()
    };

    console.log('📊 News analysis completed:', analysis.summary);
    console.log('🏷️  News by sections:', Object.keys(representativeNews).map(section => 
      `${section}: ${representativeNews[section]?.length || 0}개`
    ).join(', '));
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error analyzing news content:', error.message);
    return {
      error: error.message,
      totalNews: 0,
      summary: '뉴스 분석 중 오류가 발생했습니다.'
    };
  }
}

// 기존 함수와의 호환성을 위한 래퍼
export async function runBrowserAutomationLegacy(commands) {
  console.warn('runBrowserAutomationLegacy is deprecated. Use runBrowserAutomation instead.');

  // 기존 명령어 구조를 새로운 구조로 변환
  const convertedCommands = Array.isArray(commands) ? commands : [commands];

  return await runBrowserAutomation(convertedCommands);
}
