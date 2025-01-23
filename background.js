chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const url = tab.url;
    const isMeeting = url.includes('meet.google.com') || url.includes('zoom.us');
    
    if (isMeeting) {
      chrome.action.setPopup({ tabId, popup: 'popup.html' });
    }
  }
});