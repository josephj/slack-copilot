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

  setTimeout(injectScript, 1000);
};
