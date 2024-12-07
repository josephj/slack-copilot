import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});
