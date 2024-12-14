import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import type { ComponentPropsWithoutRef } from 'react';
import { useState, useEffect } from 'react';

type ThreadData = {
  channel: string;
  messages: Array<{
    text: string;
    user: string;
    ts: string;
  }>;
};

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [isLoading, setIsLoading] = useState(true);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);

  useEffect(() => {
    const handleMessage = (message: any, sender: chrome.runtime.MessageSender, sendResponse: () => void) => {
      if (message.type === 'THREAD_DATA_RESULT') {
        const threadData = message.payload;
        setThreadData(threadData);
        setIsLoading(false);
      }
      sendResponse(); // Always send a response
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  if (isLoading) {
    return (
      <div className={`flex h-screen items-center justify-center ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
        <p className={`text-lg ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>Analysing thread...</p>
      </div>
    );
  }

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <div className={`p-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        {threadData ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Thread Messages</h2>
            <div className="space-y-2">
              {threadData.messages.map((message, index) => (
                <div key={index} className={`rounded-lg p-3 ${isLight ? 'bg-white' : 'bg-gray-700'}`}>
                  <p className="font-semibold">{message.user}</p>
                  <p>{message.text}</p>
                  <p className="text-sm text-gray-500">{new Date(parseFloat(message.ts) * 1000).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p>No thread data available</p>
        )}
      </div>
    </div>
  );
};

const ToggleButton = (props: ComponentPropsWithoutRef<'button'>) => {
  const theme = useStorage(exampleThemeStorage);
  return (
    <button
      className={
        props.className +
        ' ' +
        'font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ' +
        (theme === 'light' ? 'bg-white text-black' : 'bg-black text-white')
      }
      onClick={exampleThemeStorage.toggle}>
      {props.children}
    </button>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
