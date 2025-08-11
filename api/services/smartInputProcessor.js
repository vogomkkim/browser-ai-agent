import { GeminiProvider } from './aiProviders/geminiProvider.js';

export class SmartInputProcessor {
  constructor(apiKey, model = 'gemini-1.5-flash') {
    this.gemini = new GeminiProvider(apiKey, model);
  }

  async processUserIntent(userInput) {
    try {
      const prompt = `
당신은 사용자의 일반적인 요청을 구체적인 웹 자동화 명령으로 변환하는 역할을 합니다.

**중요한 변환 규칙:**
1. **뉴스 카테고리 관련**: 
   - "정치기사는 뭐가 있어?" → "네이버 뉴스 정치 카테고리로 이동해줘"
   - "IT 뉴스 보여줘" → "네이버 뉴스 IT 카테고리로 이동해줘"
   - "경제 뉴스는?" → "네이버 뉴스 경제 카테고리로 이동해줘"

2. **세계/국제 뉴스 관련**:
   - "다른 나라에는 별일 없어?" → "네이버 뉴스 세계 카테고리로 이동해줘"
   - "세계 뉴스는?" → "네이버 뉴스 세계 카테고리로 이동해줘"
   - "외국 뉴스 보여줘" → "네이버 뉴스 세계 카테고리로 이동해줘"

3. **날씨 관련**: "네이버에서 [지역] 날씨 검색해줘"
4. **쇼핑 관련**: "쿠팡에서 [상품] 검색해줘"
5. **일반 검색**: "구글에서 [검색어] 검색해줘"

**핵심 원칙**: 뉴스 관련 질문은 네이버 뉴스의 해당 카테고리로 직접 이동하는 것이 효율적입니다.

사용자 입력: "${userInput}"
변환된 명령:
`;

      const response = await this.gemini.generateResponse(prompt);

      // 응답에서 명령어 추출
      const command = this.extractCommand(response);

      return {
        success: true,
        originalInput: userInput,
        processedCommand: command,
        reasoning: response
      };

    } catch (error) {
      return {
        success: false,
        originalInput: userInput,
        processedCommand: userInput, // 변환 실패시 원본 사용
        error: error.message
      };
    }
  }

  extractCommand(response) {
    // 응답에서 명령어 부분만 추출
    const lines = response.split('\n');
    for (const line of lines) {
      if (line.includes('네이버') || line.includes('구글') || line.includes('쿠팡') || 
          line.includes('검색') || line.includes('보여줘') || line.includes('이동') || line.includes('카테고리')) {
        return line.trim();
      }
    }
    
    // 명확한 명령어가 없으면 원본 반환
    return response.trim();
  }

  // 일반적인 패턴 매칭 (AI 없이도 작동) - 카테고리 직접 이동으로 개선
  static getCommonPatterns() {
    return {
      '날씨': '네이버에서 서울 날씨 검색해줘',
      '뉴스': '네이버 뉴스에서 최신 뉴스 헤드라인 보여줘',
      'IT 뉴스': '네이버 뉴스 IT 카테고리로 이동해줘',
      'IT': '네이버 뉴스 IT 카테고리로 이동해줘',
      '기술 뉴스': '네이버 뉴스 IT 카테고리로 이동해줘',
      '정치기사': '네이버 뉴스 정치 카테고리로 이동해줘',
      '정치 뉴스': '네이버 뉴스 정치 카테고리로 이동해줘',
      '정치': '네이버 뉴스 정치 카테고리로 이동해줘',
      '경제 뉴스': '네이버 뉴스 경제 카테고리로 이동해줘',
      '경제': '네이버 뉴스 경제 카테고리로 이동해줘',
      '사회 뉴스': '네이버 뉴스 사회 카테고리로 이동해줘',
      '사회': '네이버 뉴스 사회 카테고리로 이동해줘',
      '스포츠 뉴스': '네이버 뉴스 스포츠 카테고리로 이동해줘',
      '스포츠': '네이버 뉴스 스포츠 카테고리로 이동해줘',
      '연예 뉴스': '네이버 뉴스 연예 카테고리로 이동해줘',
      '연예': '네이버 뉴스 연예 카테고리로 이동해줘',
      '세계 뉴스': '네이버 뉴스 세계 카테고리로 이동해줘',
      '세계': '네이버 뉴스 세계 카테고리로 이동해줘',
      '외국': '네이버 뉴스 세계 카테고리로 이동해줘',
      '다른 나라': '네이버 뉴스 세계 카테고리로 이동해줘',
      '국제': '네이버 뉴스 세계 카테고리로 이동해줘',
      '쇼핑': '쿠팡에서 인기 상품 검색해줘',
      '검색': '구글에서 검색어를 입력해주세요',
      '주식': '네이버 금융에서 주요 주식 시세 보여줘',
      '지도': '네이버 지도에서 현재 위치 주변 검색해줘',
      
      // 🔥 새로운 패턴: 카테고리 목록 요청
      '뉴스에 무슨 카테고리': '네이버 뉴스에서 사용 가능한 모든 카테고리 목록을 보여줘',
      '뉴스 카테고리': '네이버 뉴스에서 사용 가능한 모든 카테고리 목록을 보여줘',
      '카테고리 목록': '네이버 뉴스에서 사용 가능한 모든 카테고리 목록을 보여줘',
      '어떤 카테고리': '네이버 뉴스에서 사용 가능한 모든 카테고리 목록을 보여줘',
      '무슨 카테고리': '네이버 뉴스에서 사용 가능한 모든 카테고리 목록을 보여줘',
      
      // 🔥 새로운 패턴: 콘텐츠 추출 및 분석 요청
      '경제 주요 헤드라인': '경제 주요 헤드라인만 보여줘',
      '경제 헤드라인': '경제 주요 헤드라인만 보여줘',
      '경제 뉴스 요약': '경제 뉴스 요약해줘',
      'IT 주요 뉴스': 'IT 주요 뉴스만 보여줘',
      'IT 헤드라인': 'IT 주요 헤드라인만 보여줘',
      '정치 주요 뉴스': '정치 주요 뉴스만 보여줘',
      '정치 헤드라인': '정치 주요 헤드라인만 보여줘',
      '세계 주요 뉴스': '세계 주요 뉴스만 보여줘',
      '세계 헤드라인': '세계 주요 헤드라인만 보여줘'
    };
  }

  // 빠른 패턴 매칭 (AI 응답 대기 없이) - 우선순위 기반으로 개선
  static quickProcess(input) {
    const patterns = this.getCommonPatterns();
    const lowerInput = input.toLowerCase();

    // 🔍 요청 의도 분석
    const intent = this.analyzeIntent(input);
    console.log(`🎯 Intent analysis: ${intent.type} - ${intent.reason}`);

    // 우선순위가 높은 패턴부터 확인 (더 구체적인 패턴 우선)
    const priorityPatterns = [
      // 카테고리별 주요 뉴스/헤드라인 요청 (높은 우선순위)
      '경제 주요 헤드라인', 'IT 주요 뉴스', '정치 주요 뉴스', '세계 주요 뉴스',
      '경제 헤드라인', 'IT 헤드라인', '정치 헤드라인', '세계 헤드라인',
      '경제 뉴스 요약',
      
      // 카테고리 이동 요청
      '경제', 'IT', '정치', '사회', '스포츠', '연예', '세계', '과학',
      '정치기사', '경제기사', 'IT기사', '세계 뉴스', '외국', '다른 나라', '국제',
      
      // 일반적인 뉴스 요청
      '뉴스', '최신 뉴스', '뉴스 보기', '뉴스 확인'
    ];

    for (const pattern of priorityPatterns) {
      if (lowerInput.includes(pattern.toLowerCase())) {
        return {
          success: true,
          originalInput: input,
          processedCommand: patterns[pattern],
          method: 'priority-pattern-matching',
          intent: intent
        };
      }
    }

    return {
      success: false,
      originalInput: input,
      processedCommand: input,
      method: 'no-pattern',
      intent: intent
    };
  }

  // 🔍 요청 의도 분석
  static analyzeIntent(input) {
    const lowerInput = input.toLowerCase();
    
    // 정보 요청 패턴 (알고 싶다)
    const informationalPatterns = [
      '알려줘', '보여줘', '요약', '헤드라인', '뉴스', '어떤가', '뭐가', '무엇',
      '현황', '상황', '상태', '결과', '내용', '정보'
    ];
    
    // 액션 요청 패턴 (하고 싶다)
    const actionablePatterns = [
      '열어줘', '이동해줘', '가줘', '들어가줘', '접속해줘', '로그인해줘',
      '검색해줘', '찾아줘', '보내줘', '작성해줘', '삭제해줘', '수정해줘'
    ];
    
    // 정보 요청인지 확인
    const isInformational = informationalPatterns.some(pattern => 
      lowerInput.includes(pattern)
    );
    
    // 액션 요청인지 확인  
    const isActionable = actionablePatterns.some(pattern => 
      lowerInput.includes(pattern)
    );
    
    if (isInformational && !isActionable) {
      return {
        type: 'informational',
        reason: '사용자가 정보를 알고 싶어함 (콘텐츠 추출 후 채팅 응답)',
        browserMode: 'background'
      };
    } else if (isActionable) {
      return {
        type: 'actionable', 
        reason: '사용자가 웹에서 직접 액션을 수행하고 싶어함 (브라우저 포어그라운드)',
        browserMode: 'foreground'
      };
    } else {
      return {
        type: 'mixed',
        reason: '의도가 명확하지 않음 (기본값으로 처리)',
        browserMode: 'background'
      };
    }
  }
}
