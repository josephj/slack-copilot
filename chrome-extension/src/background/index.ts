import 'webextension-polyfill';
// import { exampleThemeStorage } from '@extension/storage';
import debounce from 'debounce';
// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// exampleThemeStorage.get().then(theme => {
//   console.log('theme', theme);
// });

const filters = {
  url: [
    {
      hostSuffix: 'app.slack.com',
      pathContains: 'client',
    },
  ],
};

const handleLoadPage = async ({ tabId, url }: { tabId: number; url: string }) => {
  chrome.tabs.sendMessage(tabId, {
    type: 'loadPage',
    value: url,
  });
};
const handleLoadPageDebounced = debounce(handleLoadPage, 500);

chrome.webNavigation.onHistoryStateUpdated.addListener(handleLoadPageDebounced, filters);
chrome.webNavigation.onCompleted.addListener(handleLoadPageDebounced, filters);

chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'SLACK_THREAD_DATA') {
    console.log('[DEBUG] SLACK_THREAD_DATA:', message.data);
  }

  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.id) {
        chrome.sidePanel.open({ tabId: currentTab.id });
      }
    });
  }
});
