export type ErrorResponse = {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
};

type ChatCompletionMessageRole = 'system' | 'user' | 'assistant';

export type ChatCompletionOptions = {
  model: string;
  messages: Array<{
    role: ChatCompletionMessageRole;
    content: string;
  }>;
  temperature: number;
  stream: boolean;
  max_tokens?: number;
};

export type AskAssistantOptions = {
  onAbort?: () => void;
  onError?: (error: Error) => void;
  onUpdate?: (response: string) => void;
  onComplete?: (fullResponse: string) => void;
};
