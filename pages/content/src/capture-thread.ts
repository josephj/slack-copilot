export const captureThread = () => {
  if (window.location.hostname !== 'app.slack.com') {
    return;
  }

  const injectScript = () => {
    const scriptEl = document.createElement('script');
    scriptEl.src = chrome.runtime.getURL('injected.js');
    scriptEl.type = 'module';
    (document.head || document.documentElement).appendChild(scriptEl);
    scriptEl.onload = () => {
      window.postMessage({ type: 'ORIGIN', origin: window.location.href }, '*');
    };
  };

  setTimeout(() => {
    injectScript();
  }, 1000);

  const handleMessage = (event: MessageEvent) => {
    const { type, data } = event.data;
    if (type === 'SLACK_THREAD_DATA') {
      console.log('[DEBUG] SLACK_THREAD_DATA Thread data:', data);
    }
  };

  window.addEventListener('message', handleMessage);
};

// window.addEventListener('message', event => {
//   if (event.data.type === 'SLACK_THREAD_DATA') {
//     chrome.runtime.sendMessage({
//       type: 'SLACK_THREAD_DATA',
//       value: event.data,
//     });
//   }
// });
