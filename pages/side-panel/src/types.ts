export type Language = {
  code: string;
  name: string;
};

export type ThreadData = {
  channel: string;
  messages: Array<{
    text: string;
    user: string;
    ts: string;
    reactions: Array<{
      name: string;
      count: number;
    }>;
  }>;
};

export type ThreadDataMessage = {
  type: 'THREAD_DATA_RESULT';
  payload: ThreadData;
};

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
