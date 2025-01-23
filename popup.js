let isRecording = false;

function updatePopupState(recording) {
  const startButton = document.getElementById('startRecord');
  const stopButton = document.getElementById('stopRecord');
  const statusDiv = document.getElementById('status');

  if (recording) {
    startButton.disabled = true;
    stopButton.disabled = false;
    statusDiv.textContent = 'Recording...';
  } else {
    startButton.disabled = false;
    stopButton.disabled = true;
    statusDiv.textContent = 'Meeting detected';
  }
}

function initializePopup() {
  const startButton = document.getElementById('startRecord');
  const stopButton = document.getElementById('stopRecord');
  const statusDiv = document.getElementById('status');

  // Get the current recording state
  chrome.storage.local.get(['isRecording'], (result) => {
    isRecording = result.isRecording || false;
    updatePopupState(isRecording);
  });

  // Get the current tab
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    
    const url = tabs[0].url;
    const isMeeting = url.includes('meet.google.com') || url.includes('zoom.us');
    
    if (isMeeting) {
      if (!isRecording) {
        statusDiv.textContent = 'Meeting detected';
        startButton.disabled = false;
      }
      
      startButton.addEventListener('click', () => {
        isRecording = true;
        chrome.storage.local.set({ isRecording: true });
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startRecording' });
        updatePopupState(true);
      });

      stopButton.addEventListener('click', () => {
        isRecording = false;
        chrome.storage.local.set({ isRecording: false });
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopRecording' });
        updatePopupState(false);
      });
    }
  });
}

// Initialize as soon as the popup loads
document.addEventListener('DOMContentLoaded', initializePopup);