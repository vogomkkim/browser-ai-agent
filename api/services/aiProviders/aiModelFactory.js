import { GeminiProvider } from './geminiProvider.js';
import { getConfig } from '../../config/config.js';

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
    const appConfig = getConfig();
    return {
      provider: appConfig.ai.provider,
      model: appConfig.ai.model,
      apiKey: appConfig.ai.geminiApiKey,
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
