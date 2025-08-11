import { AIModelFactory } from './aiProviders/aiModelFactory.js';

export async function buildCommandList(inputText) {
  try {
    // AI 모델 설정 가져오기
    const config = AIModelFactory.getDefaultConfig();
    
    // 설정 유효성 검사
    AIModelFactory.validateConfig(config);
    
    // AI 모델 프로바이더 생성
    const aiProvider = AIModelFactory.createProvider(config);
    
    // 명령어 생성 시작 시간 기록
    const startTime = Date.now();
    
    // AI를 사용하여 명령어 리스트 생성
    const commands = await aiProvider.buildCommandList(inputText);
    
    // 처리 시간 계산
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      commands,
      modelUsed: `${config.provider}/${config.model}`,
      processingTime
    };
    
  } catch (error) {
    return {
      success: false,
      commands: [],
      error: error.message,
      modelUsed: 'unknown',
      processingTime: 0
    };
  }
}

// 기존 OpenAI 기반 함수는 호환성을 위해 유지 (deprecated)
export async function buildCommandListOpenAI(inputText) {
  console.warn('buildCommandListOpenAI is deprecated. Use buildCommandList instead.');
  
  try {
    // OpenAI 설정이 있는 경우에만 실행
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    // OpenAI 프로바이더 구현이 완료되면 여기서 사용
    throw new Error('OpenAI provider not yet implemented in new architecture');
    
  } catch (error) {
    return {
      success: false,
      commands: [],
      error: error.message,
      modelUsed: 'openai',
      processingTime: 0
    };
  }
}
