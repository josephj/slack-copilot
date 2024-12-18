import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect, useCallback } from 'react';
import { askAssistant } from './ask-assistant';
import ReactMarkdown from 'react-markdown';

type Language = {
  code: string;
  name: string;
};

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'zh-TW', name: 'Traditional Chinese (Taiwan)' },
  { code: 'zh-CN', name: 'Simplified Chinese' },
  { code: 'zh-HK', name: 'Traditional Chinese (Hong Kong)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-AU', name: 'English (Australia)' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'ru', name: 'Russian' },
  { code: 'fil', name: 'Filipino' },
  { code: 'th', name: 'Thai' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

type ThreadData = {
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

type ThreadDataMessage = {
  type: 'THREAD_DATA_RESULT';
  payload: ThreadData;
};

const formatThreadForLLM = (threadData: ThreadData) => {
  return JSON.stringify(
    {
      channel: threadData.channel,
      messages: threadData.messages.map(message => ({
        user: message.user,
        content: message.text,
        timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
        reactions:
          message.reactions?.map(reaction => ({
            emoji: reaction.name,
            count: reaction.count,
          })) || [],
      })),
    },
    null,
    2,
  );
};

type Message = {
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
};

const SidePanel = () => {
  const isLight = true;
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('zh-TW');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    chrome.storage.local.get('selectedLanguage').then(result => {
      if (result.selectedLanguage) {
        setSelectedLanguage(result.selectedLanguage);
      }
    });
  }, []);

  const handleAskAssistant = useCallback(
    async (prompt: string, isInitialAnalysis = false) => {
      setIsTyping(true);
      setIsGenerating(true);

      const systemPrompt = `You are a helpful assistant that can analyze thread conversation and provide insights in ${
        SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)?.name
      } (${selectedLanguage}). ${
        isInitialAnalysis
          ? 'Taking the reactions as the importance consideration but not necessary to show it as a section. Highlight the most important information such as numbers, human names, and important dates in the thread.'
          : 'Provide concise and relevant answers to follow-up questions.'
      } Output should be in markdown format.`;

      const previousMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      await askAssistant(systemPrompt, prompt, isInitialAnalysis ? [] : previousMessages, {
        onAbort: () => {
          setIsTyping(false);
          setIsGenerating(false);
        },
        onError: () => {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Error: Failed to generate response. Please try again.',
              timestamp: Date.now(),
            },
          ]);
          setIsTyping(false);
          setIsGenerating(false);
        },
        onUpdate: response => {
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length && newMessages[newMessages.length - 1].role === 'assistant') {
              newMessages[newMessages.length - 1].content = response;
            } else {
              newMessages.push({ role: 'assistant', content: response, timestamp: Date.now() });
            }
            return newMessages;
          });
        },
        onComplete: () => {
          setIsTyping(false);
          setIsGenerating(false);
        },
      });
    },
    [selectedLanguage, messages],
  );

  const handleLanguageChange = useCallback((newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    chrome.storage.local.set({ selectedLanguage: newLanguage });
  }, []);

  useEffect(() => {
    const handleMessage = (
      message: ThreadDataMessage,
      _,
      sender: chrome.runtime.MessageSender,
      sendResponse: () => void,
    ) => {
      if (message.type === 'THREAD_DATA_RESULT') {
        setIsLoading(true);
        setThreadData(null);
        setMessages([]);

        setTimeout(() => {
          setThreadData(message.payload);
          setIsLoading(false);
          const formattedData = formatThreadForLLM(message.payload);
          handleAskAssistant(formattedData, true);
        }, 100);
      }
      sendResponse();
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [handleAskAssistant]);

  useEffect(() => {
    if (selectedLanguage) {
      if (threadData) {
        const formattedData = formatThreadForLLM(threadData);
        setMessages([]);
        handleAskAssistant(formattedData, true);
      }
    }
  }, [selectedLanguage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTyping) return;

    const newMessage: Message = {
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMessage]);
    setUserInput('');
    await handleAskAssistant(userInput);
  };

  if (isLoading) {
    return (
      <div className={`flex h-screen items-center justify-center ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
        <p className={`text-lg ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>Analysing thread...</p>
      </div>
    );
  }

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'} flex h-screen flex-col text-left`}>
      <div className={`flex-1 overflow-auto p-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        {threadData && (
          <div className="space-y-4">
            <div className="mb-4 flex items-center gap-2">
              <label htmlFor="language-select" className="font-medium">
                Output Language:
              </label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={e => handleLanguageChange(e.target.value)}
                disabled={isGenerating}
                className={`rounded-md px-3 py-1.5 ${
                  isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isGenerating ? 'cursor-not-allowed opacity-50' : ''
                }`}>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`${
                    message.role === 'assistant' ? 'bg-blue-50 dark:bg-blue-900' : 'bg-gray-50 dark:bg-gray-700'
                  } rounded-lg p-4`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.role === 'user' ? (
                      <p>{message.content}</p>
                    ) : (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{new Date(message.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
              {isTyping && <div className="animate-pulse text-sm text-gray-500">Assistant is typing...</div>}
            </div>
          </div>
        )}
        {!threadData && <p>No thread data available</p>}
      </div>

      {threadData && (
        <form onSubmit={handleSubmit} className="border-t p-4 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              disabled={isTyping}
              placeholder="Ask a follow-up question..."
              className={`flex-1 rounded-md px-3 py-2 ${
                isLight
                  ? 'border-gray-300 bg-white text-gray-900'
                  : 'border-gray-60 opacity-500 bg-gray-700 text-gray-100'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <button
              type="submit"
              disabled={isTyping || !userInput.trim()}
              className={`rounded-md bg-blue-500 px-4 py-2 text-white ${
                isTyping || !userInput.trim() ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-600'
              }`}>
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
