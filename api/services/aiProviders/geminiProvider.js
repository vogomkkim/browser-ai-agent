import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider {
  constructor(apiKey, model = 'gemini-1.5-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model });
  }

  async generateResponse(prompt, options = {}) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }

  async parseCommands(response) {
    try {
      // Gemini의 응답을 JSON 형태로 파싱
      const jsonMatch = response.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;

      // JSON 정리 및 수정
      const cleanedJson = this.cleanAndRepairJson(jsonText);
      console.log('🧹 Cleaned JSON:', cleanedJson);

      // JSON 파싱 시도
      const commands = JSON.parse(cleanedJson);

      // 명령어 유효성 검사 및 변환
      return this.validateAndTransformCommands(commands);
    } catch (error) {
      console.error('❌ JSON parsing failed:', error.message);
      console.error('🔍 Original response:', response);
      
      // JSON 파싱 실패시 대체 방법 시도
      return this.fallbackCommandParsing(response);
    }
  }

  // JSON 정리 및 수정 함수 - 최소한의 처리로 단순화
  cleanAndRepairJson(jsonText) {
    let cleaned = jsonText.trim();
    
    console.log('🔍 Original JSON text:', cleaned);
    
    // 🔥 최소한의 처리만 수행: 줄바꿈과 기본 정리만
    
    // 1. 줄바꿈 문자를 공백으로 변환 (JSON 파싱 방해 요소 제거)
    cleaned = cleaned.replace(/\n/g, ' ').replace(/\r/g, ' ');
    
    // 2. 연속된 공백을 단일 공백으로 정리
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // 3. 🔥 정확한 작은따옴표 패턴 감지: JSON 속성/값의 작은따옴표만 변환
    // 패턴: 콜론(:) 앞의 작은따옴표(속성명) 또는 콜론(:) 뒤의 작은따옴표(값)
    if (cleaned.includes("'")) {
      console.log('⚠️  Single quotes detected, analyzing pattern...');
      
      // 🔍 JSON 속성명의 작은따옴표 변환 (예: 'key': -> "key":)
      cleaned = cleaned.replace(/'([^']+)':/g, '"$1":');
      
      // 🔍 JSON 값의 작은따옴표 변환 (예: : 'value' -> : "value")
      cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"');
      
      console.log('🔄 Converted JSON property/value single quotes to double quotes');
    }
    
    // 4. 최종 공백 정리
    cleaned = cleaned.trim();
    
    console.log('🔧 JSON repair completed (minimal processing)');
    console.log('🧹 Final cleaned JSON:', cleaned);
    
    return cleaned;
  }

  // 대체 명령어 파싱 (JSON 파싱 실패시)
  fallbackCommandParsing(response) {
    console.log('🔄 Using AI-driven dynamic element discovery...');
    
    try {
      // AI를 사용해서 동적으로 명령어 생성
      return this.generateDynamicCommands(response);
      
    } catch (fallbackError) {
      throw new Error(`AI-driven parsing failed: ${fallbackError.message}`);
    }
  }

  // AI 기반 동적 명령어 생성
  async generateDynamicCommands(response) {
    console.log('🧠 AI analyzing response for dynamic command generation...');
    
    const prompt = `
당신은 웹 자동화 명령을 분석해서 동적 탐색 명령어를 생성하는 역할을 합니다.

**입력된 응답:**
${response}

**목표:**
1. 사용자가 원하는 웹 동작 파악
2. 동적 탐색이 필요한 요소 식별
3. 적절한 명령어 시퀀스 생성

**동적 탐색 원칙:**
- 하드코딩된 선택자 사용 금지
- 페이지를 읽어서 요소를 동적으로 찾기
- requiresDynamicSearch: true 사용
- targetText와 targetCategory를 AI가 동적으로 결정

**출력 형식:**
\`\`\`json
[
  { "action": "goto", "url": "실제_URL", "description": "설명" },
  { "action": "wait", "delay": 2000, "description": "페이지 로딩 대기" },
  { 
    "action": "click", 
    "requiresDynamicSearch": true,
    "targetText": "찾을_텍스트",
    "targetCategory": "카테고리_힌트",
    "description": "동적 탐색으로 요소 찾아서 클릭"
  },
  { "action": "wait", "delay": 2000, "description": "결과 페이지 로딩 대기" }
]
\`\`\`

**중요:**
- targetText는 실제 페이지에서 찾을 수 있는 텍스트여야 함
- targetCategory는 AI가 페이지 구조를 분석해서 추론해야 함
- 하드코딩된 매핑 금지

동적 탐색 명령어를 생성하세요:
`;

    try {
      const aiResponse = await this.generateResponse(prompt);
      console.log('🤖 AI generated dynamic commands:', aiResponse);
      
      // AI 응답에서 JSON 추출
      const jsonMatch = aiResponse.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
      console.log('🔍 JSON match:', jsonMatch);
      if (jsonMatch) {
        const jsonText = jsonMatch[1];
        const cleanedJson = this.cleanAndRepairJson(jsonText);
        const commands = JSON.parse(cleanedJson);
        
        console.log('✅ AI-driven dynamic commands parsed successfully');
        return this.validateAndTransformCommands(commands);
      } else {
        throw new Error('AI response does not contain valid JSON');
      }
      
    } catch (error) {
      console.error('❌ AI-driven command generation failed:', error.message);
      
      // 최후의 수단: 기본적인 goto 명령어만 생성
      console.log('🆘 Falling back to basic goto command...');
      return this.generateBasicCommands(response);
    }
  }

  // 최후의 수단: 기본 명령어 생성
  generateBasicCommands(response) {
    const commands = [];
    
    // URL 추출 시도
    const urlMatch = response.match(/(https?:\/\/[^\s"']+)/);
    if (urlMatch) {
      commands.push({
        action: 'goto',
        url: urlMatch[1],
        description: '페이지로 이동'
      });
      
      commands.push({
        action: 'wait',
        delay: 2000,
        description: '페이지 로딩 대기'
      });
    }
    
    if (commands.length === 0) {
      throw new Error('No commands could be extracted from response');
    }
    
    console.log('✅ Basic commands generated as fallback');
    return this.validateAndTransformCommands(commands);
  }

  validateAndTransformCommands(commands) {
    if (!Array.isArray(commands)) {
      throw new Error('Commands must be an array');
    }

    return commands.map((cmd, index) => {
      if (!cmd.action) {
        throw new Error(`Command ${index}: missing 'action' field`);
      }

      // 지원되는 액션 목록
      const supportedActions = ['goto', 'type', 'press', 'click', 'wait', 'screenshot', 'scroll', 'extractText', 'analyzeContent'];
      
      if (!supportedActions.includes(cmd.action)) {
        // 지원되지 않는 액션을 지원되는 액션으로 변환
        const convertedAction = this.convertUnsupportedAction(cmd.action, cmd);
        if (convertedAction) {
          console.log(`🔄 Converted unsupported action '${cmd.action}' to '${convertedAction.action}'`);
          return convertedAction;
        } else {
          throw new Error(`Command ${index}: unsupported action '${cmd.action}'. Supported actions: ${supportedActions.join(', ')}`);
        }
      }

      // 기본 명령어 구조 생성
      const command = {
        action: cmd.action,
        description: cmd.description || `${cmd.action} action`,
      };

      // action별로 필요한 필드 추가
      switch (cmd.action) {
        case 'goto':
          if (!cmd.url) throw new Error(`Command ${index}: 'goto' requires 'url' field`);
          command.url = cmd.url;
          break;

        case 'type':
          if (!cmd.selector) throw new Error(`Command ${index}: 'type' requires 'selector' field`);
          if (!cmd.value) throw new Error(`Command ${index}: 'type' requires 'value' field`);
          command.selector = cmd.selector;
          command.value = cmd.value;
          break;

        case 'press':
          if (!cmd.selector) throw new Error(`Command ${index}: 'press' requires 'selector' field`);
          if (!cmd.key) throw new Error(`Command ${index}: 'press' requires 'key' field`);
          command.selector = cmd.selector;
          command.key = cmd.key;
          break;

        case 'click':
          // 동적 탐색이 필요한 경우 selector 필드가 필요 없음
          if (cmd.requiresDynamicSearch) {
            // 동적 탐색 관련 필드들 추가
            if (cmd.targetText) command.targetText = cmd.targetText;
            if (cmd.targetCategory) command.targetCategory = cmd.targetCategory;
            command.requiresDynamicSearch = true;
            console.log(`🔍 Dynamic search command detected: ${cmd.targetText || 'unknown'} in ${cmd.targetCategory || 'unknown'}`);
          } else {
            // 일반 클릭의 경우 selector 필드 필요
            if (!cmd.selector) throw new Error(`Command ${index}: 'click' requires 'selector' field (unless using dynamic search)`);
            command.selector = cmd.selector;
          }
          break;

        case 'wait':
          command.delay = cmd.delay || 1000;
          break;

        case 'screenshot':
          // 스크린샷은 추가 옵션 없이 실행
          break;

        case 'scroll':
          command.direction = cmd.direction || 'down';
          break;

        case 'extractText':
          if (!cmd.selector) throw new Error(`Command ${index}: 'extractText' requires 'selector' field`);
          command.selector = cmd.selector;
          break;

        case 'analyzeContent':
          // analyzeContent는 추가 필드가 필요 없음 (페이지 전체 분석)
          break;

        default:
          throw new Error(`Command ${index}: unknown action '${cmd.action}'`);
      }

      return command;
    });
  }

  // 지원되지 않는 액션을 지원되는 액션으로 변환
  convertUnsupportedAction(action, cmd) {
    switch (action) {
      case 'waitForSelector':
        // waitForSelector를 wait로 변환
        return {
          action: 'wait',
          delay: 2000,
          description: `Waiting for element ${cmd.selector || 'to load'} (converted from waitForSelector)`
        };

      case 'waitForNavigation':
        // waitForNavigation을 wait로 변환
        return {
          action: 'wait',
          delay: 3000,
          description: 'Waiting for page navigation to complete (converted from waitForNavigation)'
        };

      case 'fill':
        // fill을 type으로 변환
        return {
          action: 'type',
          selector: cmd.selector,
          value: cmd.value || '',
          description: `Filling form field ${cmd.selector} (converted from fill)`
        };

      case 'selectOption':
        // selectOption을 click으로 변환
        return {
          action: 'click',
          selector: cmd.selector,
          description: `Selecting option in ${cmd.selector} (converted from selectOption)`
        };

      default:
        return null;
    }
  }

  async buildCommandList(inputText) {
    const prompt = `
당신은 사용자의 웹 탐색 명령을 Playwright 자동화 명령으로 변환하는 역할을 합니다.

**중요: 다음 액션만 사용하세요:**
- goto: 페이지 이동
- type: 텍스트 입력
- press: 키 입력
- click: 요소 클릭
- wait: 대기
- screenshot: 스크린샷
- scroll: 스크롤
- extractText: 특정 요소에서 텍스트 추출
- analyzeContent: 페이지 콘텐츠 분석 및 요약

**지원되지 않는 액션 (사용 금지):**
- waitForSelector, waitForNavigation, fill, selectOption 등

**명령어 생성 규칙:**
1. 각 명령어는 반드시 지원되는 액션만 사용
2. selector는 CSS 선택자 형식 사용
3. 적절한 대기 시간 포함
4. 명확한 설명 제공
5. **복잡한 네비게이션은 단계별로 분해**
6. **동적 요소는 탐색 후 클릭 방식 사용**
7. **하드코딩된 선택자 대신 동적 탐색 사용**

**효율적인 접근 방법:**
- **단계별 접근**: 복잡한 작업을 여러 단계로 분해
- **탐색과 검증**: 각 단계 후 적절한 대기와 확인
- **적응형 실행**: 사이트 구조에 맞춰 동적으로 조정
- **동적 요소 찾기**: 페이지를 읽어서 요소를 동적으로 식별

**동적 탐색 명령어 생성:**
탭이나 카테고리 같은 동적 요소를 클릭할 때는:
- 하드코딩된 선택자 사용 금지
- requiresDynamicSearch: true 설정
- targetText와 targetCategory 지정
- 시스템이 페이지를 읽어서 적절한 요소를 자동으로 찾음

**예시 - 단계별 접근:**
입력: "구글에서 쿠팡 노트북 검색해줘"
출력:
\`\`\`json
[
  { "action": "goto", "url": "https://google.com", "description": "구글 홈페이지로 이동" },
  { "action": "wait", "delay": 2000, "description": "페이지 로딩 대기" },
  { "action": "type", "selector": "input[name='q']", "value": "쿠팡 노트북", "description": "검색어 입력" },
  { "action": "press", "selector": "input[name='q']", "key": "Enter", "description": "검색 실행" }
]
\`\`\`

**예시 - 동적 탐색 (페이지를 읽어서 요소 찾기):**
입력: "네이버 뉴스 IT 카테고리로 이동해줘"
출력:
\`\`\`json
[
  { "action": "goto", "url": "https://news.naver.com", "description": "네이버 뉴스 홈페이지로 이동" },
  { "action": "wait", "delay": 2000, "description": "페이지 로딩 대기" },
  { 
    "action": "click", 
    "requiresDynamicSearch": true,
    "targetText": "IT",
    "targetCategory": "과학",
    "description": "IT.과학 카테고리 탭을 동적으로 찾아서 클릭"
  },
  { "action": "wait", "delay": 2000, "description": "IT 뉴스 페이지 로딩 대기" }
]
\`\`\`

**예시 - 동적 탐색 (복잡한 경우):**
입력: "네이버 뉴스에서 최신 IT 뉴스 헤드라인 보여줘"
출력:
\`\`\`json
[
  { "action": "goto", "url": "https://news.naver.com", "description": "네이버 뉴스 홈페이지로 이동" },
  { "action": "wait", "delay": 2000, "description": "페이지 로딩 대기" },
  { 
    "action": "click", 
    "requiresDynamicSearch": true,
    "targetText": "IT",
    "targetCategory": "과학",
    "description": "IT.과학 카테고리 탭을 동적으로 찾아서 클릭"
  },
  { "action": "wait", "delay": 2000, "description": "IT 뉴스 페이지 로딩 대기" },
  { "action": "scroll", "direction": "down", "description": "최신 뉴스 헤드라인 확인을 위해 스크롤" }
]
\`\`\`

**예시 - 콘텐츠 추출 및 분석:**
입력: "경제 주요 헤드라인만 보여줘"
출력:
\`\`\`json
[
  { "action": "goto", "url": "https://news.naver.com", "description": "네이버 뉴스 홈페이지로 이동" },
  { "action": "wait", "delay": 2000, "description": "페이지 로딩 대기" },
  { 
    "action": "click", 
    "requiresDynamicSearch": true,
    "targetText": "경제",
    "targetCategory": "경제",
    "description": "경제 카테고리 탭을 동적으로 찾아서 클릭"
  },
  { "action": "wait", "delay": 2000, "description": "경제 뉴스 페이지 로딩 대기" },
  { 
    "action": "analyzeContent", 
    "description": "경제 뉴스 헤드라인 분석 및 주요 뉴스 추출"
  }
]
\`\`\`

입력: "${inputText}"
출력:
`;

    try {
      const response = await this.generateResponse(prompt);
      return await this.parseCommands(response);
    } catch (error) {
      throw new Error(`Failed to build command list: ${error.message}`);
    }
  }
}
