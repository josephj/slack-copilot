import { Button } from '@extension/ui';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { useState, useEffect, useCallback } from 'react';

type Position = {
  x: number;
  y: number;
  show: boolean;
  linkUrl?: string;
};

export default function App() {
  const theme = useStorage(exampleThemeStorage);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0, show: false });
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [hideTimeoutId, setHideTimeoutId] = useState<number | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      setHideTimeoutId(null);
    }
  }, [hideTimeoutId]);

  const hideButton = useCallback(() => {
    clearHideTimeout();
    const timeoutId = window.setTimeout(() => {
      setPosition(prev => ({ ...prev, show: false }));
    }, 500);
    setHideTimeoutId(Number(timeoutId));
  }, [clearHideTimeout]);

  useEffect(() => {
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.getAttribute('data-qa') === 'reply_bar_view_thread' ||
        (target.tagName === 'A' && target.getAttribute('href')?.includes('/archives/'))
      ) {
        clearHideTimeout();
        const rect = target.getBoundingClientRect();
        const linkElement = target.getAttribute('data-qa') === 'reply_bar_view_thread' ? target.closest('a') : target;
        const linkUrl = linkElement?.getAttribute('href') || '';

        setPosition({
          x: rect.right,
          y: rect.top + rect.height / 2,
          show: true,
          linkUrl,
        });
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;

      if (
        (target.getAttribute('data-qa') === 'reply_bar_view_thread' || target.tagName === 'A') &&
        !relatedTarget?.closest('#star-button') &&
        !isButtonHovered
      ) {
        hideButton();
      }
    };

    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
      clearHideTimeout();
    };
  }, [isButtonHovered, clearHideTimeout, hideButton]);

  const handleButtonMouseEnter = () => {
    clearHideTimeout();
    setIsButtonHovered(true);
  };

  const handleButtonMouseLeave = () => {
    setIsButtonHovered(false);
    const linkElement = document.querySelector('a:hover');
    if (!linkElement?.getAttribute('href')?.includes('/archives/')) {
      hideButton();
    }
  };

  const handleClickStar = () => {
    if (position.linkUrl) {
      const match = position.linkUrl.match(/\/archives\/([^/]+)\/p(\d+)/);
      if (match) {
        const [, channel, timestamp] = match;
        const threadTs = `${timestamp.slice(0, -6)}.${timestamp.slice(-6)}`;

        // Then fetch the thread data
        setTimeout(() => {
          window.postMessage(
            {
              type: 'FETCH_THREAD_DATA',
              payload: {
                channel,
                threadTs,
              },
            },
            '*',
          );
        }, 1000);

        chrome.runtime.sendMessage({
          type: 'OPEN_SIDE_PANEL',
          payload: {
            linkUrl: position.linkUrl,
          },
        });
      }
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'THREAD_DATA_RESULT') {
        chrome.runtime.sendMessage({
          type: 'THREAD_DATA_RESULT',
          payload: event.data.payload,
          url: position.linkUrl,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [position.linkUrl]);

  return (
    <div id="content-ui-root" className="pointer-events-none fixed inset-0 z-[9999]">
      {position.show && (
        <Button
          id="star-button"
          theme={theme}
          onClick={handleClickStar}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
          style={{
            position: 'fixed',
            left: `${position.x + 10}px`,
            top: `${position.y}px`,
            transform: 'translateY(-50%)',
          }}
          className="pointer-events-auto flex h-6 items-center gap-2 rounded-full px-2 shadow-lg transition-transform hover:scale-105">
          <span className="text-xs">⭐</span>
          <span className="text-xs">Summarize</span>
        </Button>
      )}
    </div>
  );
}
