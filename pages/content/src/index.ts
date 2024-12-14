import { toggleTheme } from '@src/toggleTheme';

import { captureThread } from './capture-thread';
import { triggerFetchThread } from './utils';

captureThread();

console.log('[DEBUG] content script loaded');

void toggleTheme();

type ThreadData = {
  title: string;
  timestamp: string;
  participants: string[];
  messages: Array<{
    sender: string;
    content: string;
    time: string;
  }>;
};

const extractThreadData = (threadsPane: Element): ThreadData => {
  // Get thread title from the dialog header
  const titleElement = threadsPane.querySelector('[data-qa="thread_view_header_title"]');
  console.log('[DEBUG] titleElement.innerHTML', titleElement?.innerHTML);
  const title = titleElement?.textContent?.trim() || '';

  // Get timestamp
  const timestampElement = threadsPane.querySelector('[data-qa="thread_view_header_timestamp"]');
  const timestamp = timestampElement?.textContent?.trim() || '';

  // Get participants
  const participantElements = threadsPane.querySelectorAll('[data-qa="thread_participant"]');
  const participants = Array.from(participantElements).map(el => el.textContent?.trim() || '');

  // Get messages
  const messageElements = threadsPane.querySelectorAll('[data-qa="message_content"]');
  const messages = Array.from(messageElements).map(messageEl => {
    const senderEl = messageEl.querySelector('[data-qa="message_sender_name"]');
    const contentEl = messageEl.querySelector('[data-qa="message-text"] .p-rich_text_section');
    const timeEl = messageEl.querySelector('[data-qa="timestamp_label"]');

    return {
      sender: senderEl?.textContent?.trim() || '',
      content: contentEl?.textContent?.trim() || '',
      time: timeEl?.textContent?.trim() || '',
    };
  });

  return {
    title,
    timestamp,
    participants,
    messages,
  };
};

// const observeThreadsPane = () => {
//   const observer = new MutationObserver((mutations, obs) => {
//     const threadsPane = document.querySelector('[data-qa="threads_flexpane"]');

//     if (threadsPane) {
//       obs.disconnect();

//       const threadData = extractThreadData(threadsPane);
//       console.log('[DEBUG] Thread data:', threadData);

//       // Send thread data to background script if needed
//       // chrome.runtime.sendMessage({
//       //   type: 'threadData',
//       //   value: threadData,
//       // });
//     }
//   });

//   observer.observe(document.body, {
//     childList: true,
//     subtree: true,
//   });
// };

// chrome.runtime.onMessage.addListener(async ({ type, value }) => {
//   if (type === 'loadPage') {
//     console.log('[DEBUG] loadPage :', value);
//     observeThreadsPane();
//   }
// });

// Add this function to trigger fetchThreadData
function triggerFetchThread(channel: string, threadTs: string) {
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
}

// Export it if you need to use it from other files
export { triggerFetchThread };

// Add this where you want to receive the results
// window.addEventListener('message', event => {
//   if (event.data.type === 'THREAD_DATA_RESULT') {
//     const threadData = event.data.payload;
//     console.log('[DEBUG] THREAD_DATA_RESULT:', threadData);
//     // Handle the thread data as needed
//   }
// });
