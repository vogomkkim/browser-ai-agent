import express from 'express';
import dotenv from 'dotenv';
import { buildCommandList } from './services/commandBuilder.js';
import { runBrowserAutomation, closeBrowser, getBrowserStatus } from './agent/browserAgent.js';
import { SmartInputProcessor } from './services/smartInputProcessor.js';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { getConfig, validateConfig } from './config/config.js';
import { createLogger } from './config/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Security and performance middlewares
const config = getConfig();
const logger = createLogger({ level: config.logging.level, file: config.logging.file });

app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.cors.origin }));

const limiter = rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max });
app.use(limiter);

// Vercel에서는 정적 파일을 루트의 public 디렉토리에서 제공
// API 서버는 /api 경로로만 접근

// 스마트 입력 프로세서 초기화
const smartProcessor = new SmartInputProcessor(config.ai.geminiApiKey);

// 환경 변수 검증
function validateEnvironment() {
  try {
    validateConfig(config);
    logger.info('Environment variables validated');
  } catch (e) {
    console.error(`❌ ${e.message}`);
    console.error('Please check your .env file or env.example for reference');
    process.exit(1);
  }
}

// 브라우저 자동화 실행 엔드포인트
app.post('/run-command', async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    logger.info(`🤖 Original user input: "${input}"`);

    // 🔍 1단계: 요청 의도 분석
    const intent = SmartInputProcessor.analyzeIntent(input);
    logger.info(`🎯 Intent: ${intent.type} - ${intent.reason}`);
    logger.info(`🌐 Browser mode: ${intent.browserMode}`);

    // 🔍 2단계: 스마트 입력 처리
    const processedInput = SmartInputProcessor.quickProcess(input);
    logger.info(`⚡ Quick pattern match: "${input}" → "${processedInput.processedCommand}"`);
    logger.info(`📋 Intent: ${processedInput.intent.type} - ${processedInput.intent.reason}`);

    // 🔍 3단계: 명령어 생성
    logger.info(`📋 Generating commands for: "${processedInput.processedCommand}"`);
    const startTime = Date.now();
    
    const commandGen = await buildCommandList(processedInput.processedCommand);

    if (!commandGen.success) {
      throw new Error(commandGen.error || 'Failed to generate commands');
    }

    // Attach modelUsed to the array for downstream logging compatibility
    const commandArray = commandGen.commands || [];
    commandArray.modelUsed = commandGen.modelUsed || `${config.ai.provider}/${config.ai.model}`;
    
    const generationTime = Date.now() - startTime;
    logger.info(`📋 Generated ${commandArray.length} commands using ${commandArray.modelUsed}`);
    logger.info(`⏱️  Command generation took ${generationTime}ms`);

    // 🔍 4단계: 브라우저 자동화 실행
    const result = await runBrowserAutomation(commandArray);
    
    // 🔍 5단계: 의도에 따른 응답 생성
    let userResponse;
    
    if (intent.type === 'informational' && result.executionSummary) {
      // 정보 요청: 사용자 친화적인 응답 생성
      userResponse = generateInformationalResponse(result, input);
    } else {
      // 액션 요청: 기본 실행 결과 응답
      userResponse = {
        type: 'action',
        message: '요청하신 작업이 완료되었습니다.',
        browserStatus: result.browserStatus,
        details: result
      };
    }

    // 🔍 6단계: 브라우저 모드에 따른 추가 처리
    if (intent.browserMode === 'background') {
      logger.info(`🌐 Browser will remain in background mode for informational request`);
      // 브라우저를 백그라운드로 유지 (사용자가 직접 보고 싶지 않음)
    } else if (intent.browserMode === 'foreground') {
      logger.info(`🌐 Browser will be brought to foreground for actionable request`);
      // 브라우저를 포어그라운드로 가져오기 (사용자가 직접 조작하고 싶음)
    }

    res.json({
      success: true,
      intent: intent,
      userResponse: userResponse,
      executionResult: result
    });

  } catch (error) {
    console.error('❌ Error in /run-command:', error);
    res.status(500).json({ 
      error: error.message,
      intent: { type: 'error', reason: '처리 중 오류가 발생했습니다.' }
    });
  }
});

// 🔍 정보 요청에 대한 사용자 친화적 응답 생성
function generateInformationalResponse(result, originalInput) {
  try {
    // analyzeContent 결과가 있는지 확인
    const analyzeResult = result.executionSummary?.commands?.find(cmd => 
      cmd.action === 'analyzeContent' && cmd.status === 'success'
    );
    
    if (analyzeResult && analyzeResult.result) {
      const analysis = analyzeResult.result;
      
      // 뉴스 헤드라인 응답 생성
      if (analysis.representativeNews) {
        const newsResponse = {
          type: 'news_summary',
          title: '📰 경제 뉴스 헤드라인 요약',
          summary: analysis.summary,
          sections: Object.keys(analysis.representativeNews).map(section => ({
            name: getSectionDisplayName(section),
            news: analysis.representativeNews[section].map(item => ({
              title: item.text,
              url: item.href,
              section: item.section
            }))
          })),
          totalNews: analysis.totalNews,
          timestamp: analysis.timestamp
        };
        
        return newsResponse;
      }
    }
    
    // 기본 응답
    return {
      type: 'general',
      message: '요청하신 정보를 수집했습니다.',
      details: result
    };
    
  } catch (error) {
    console.error('❌ Error generating informational response:', error);
    return {
      type: 'error',
      message: '응답 생성 중 오류가 발생했습니다.',
      details: result
    };
  }
}

// 🔍 구역 이름을 사용자 친화적으로 변환
function getSectionDisplayName(section) {
  const sectionNames = {
    'mainNews': '📰 주요 뉴스',
    'sidebarNews': '📋 인기 뉴스', 
    'pressNews': '🏢 언론사 뉴스',
    'issueNews': '🔥 이슈 뉴스'
  };
  
  return sectionNames[section] || section;
}

// 브라우저 상태 확인 엔드포인트
app.get('/browser/status', (req, res) => {
  const status = getBrowserStatus();
  res.json({
    success: true,
    browser: status,
    timestamp: new Date().toISOString()
  });
});

// 브라우저 종료 엔드포인트
app.post('/browser/close', async (req, res) => {
  try {
    const result = await closeBrowser();
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 상태 확인 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    aiModel: process.env.AI_MODEL_PROVIDER || 'google',
    features: {
      smartInputProcessing: true,
      intentRecognition: true,
      webAutomation: true,
      persistentBrowser: true
    }
  });
});

// 서버 시작
const PORT = config.port || process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('🚀 Browser AI Agent Server Starting...');
  validateEnvironment();
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log(`🤖 AI Model: ${config.ai.provider}/${config.ai.model}`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
  console.log(`🧠 Smart Input Processing: Enabled`);
  console.log(`⚡ Quick Pattern Matching: Enabled`);
  console.log(`🌐 Persistent Browser: Enabled`);
});
