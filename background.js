// Handle connection initialization from content scripts
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentScriptReady') {
    sendResponse({ status: 'connected' });
  }
});

function isMeetingUrl(url) {
  if (url.includes('meet.google.com')) {
    return /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url);
  } else if (url.includes('zoom.us')) {
    return /zoom\.us\/(j|my)\/\d+/.test(url);
  }
  return false;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (isMeetingUrl(tab.url)) {
      chrome.action.setPopup({ tabId, popup: 'popup.html' });
      chrome.action.openPopup(); // Automatically open the popup
    } else {
      chrome.action.setPopup({ tabId, popup: '' }); // Disable the popup if not in a meeting
    }
  }
});


chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === "getCurrentTabId") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || tabs.length === 0) {
        sendResponse({ error: chrome.runtime.lastError?.message || "No active tab found" });
      } else {
        sendResponse({ tabId: tabs[0].id });
      }
    });
    return true; // Keep the message channel open for async response
  }
});


