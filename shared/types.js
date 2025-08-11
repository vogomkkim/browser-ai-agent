// AI Model Provider Interface
export interface AIModelProvider {
  generateResponse(prompt: string, options?: any): Promise<string>;
  parseCommands(response: string): Promise<BrowserCommand[]>;
}

// Browser Automation Commands
export interface BrowserCommand {
  action: 'goto' | 'type' | 'press' | 'click' | 'wait' | 'screenshot' | 'scroll';
  selector?: string;
  value?: string;
  url?: string;
  key?: string;
  delay?: number;
  description: string;
}

// AI Model Configuration
export interface AIModelConfig {
  provider: 'google' | 'openai' | 'anthropic' | 'local';
  model: string;
  apiKey: string;
  options?: any;
}

// Command Generation Result
export interface CommandGenerationResult {
  success: boolean;
  commands: BrowserCommand[];
  error?: string;
  modelUsed: string;
  processingTime: number;
}

// Browser Automation Result
export interface BrowserAutomationResult {
  success: boolean;
  logs: string[];
  screenshots?: string[];
  error?: string;
  executionTime: number;
}
