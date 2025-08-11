import { GeminiProvider } from './geminiProvider.js';

export class AIModelFactory {
  static createProvider(config) {
    const { provider, model, apiKey, options = {} } = config;

    switch (provider.toLowerCase()) {
      case 'google':
      case 'gemini':
        return new GeminiProvider(apiKey, model);
      
      case 'openai':
        // OpenAI 프로바이더는 나중에 구현
        throw new Error('OpenAI provider not yet implemented');
      
      case 'anthropic':
        // Anthropic 프로바이더는 나중에 구현
        throw new Error('Anthropic provider not yet implemented');
      
      case 'local':
        // 로컬 모델 프로바이더는 나중에 구현
        throw new Error('Local model provider not yet implemented');
      
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  static getDefaultConfig() {
    return {
      provider: process.env.AI_MODEL_PROVIDER || 'google',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      options: {}
    };
  }

  static validateConfig(config) {
    const required = ['provider', 'model', 'apiKey'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
    
    return true;
  }
}
