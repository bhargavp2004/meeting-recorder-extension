let isRecording = false;

function updatePopupState(recording, isMeeting) {
  const startButton = document.getElementById('startRecord');
  const stopButton = document.getElementById('stopRecord');
  const statusDiv = document.getElementById('status');

  if (!isMeeting) {
    statusDiv.textContent = 'No meeting detected';
    startButton.disabled = true;
    stopButton.disabled = true;
    return;
  }

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

  // Get the current tab
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (!tabs[0]) {
      updatePopupState(false, false);
      return;
    }
    
    const url = tabs[0].url;
    const isMeeting = url.includes('meet.google.com') || url.includes('zoom.us');
    
    // Get the current recording state
    chrome.storage.local.get(['isRecording'], (result) => {
      isRecording = result.isRecording || false;
      updatePopupState(isRecording, isMeeting);
    });

    if (isMeeting) {
      startButton.addEventListener('click', () => {
        isRecording = true;
        chrome.storage.local.set({ isRecording: true });
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startRecording' });
        updatePopupState(true, isMeeting);
      });

      stopButton.addEventListener('click', () => {
        isRecording = false;
        chrome.storage.local.set({ isRecording: false });
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopRecording' });
        updatePopupState(false, isMeeting);
      });
    }
  });
}

// Initialize as soon as the popup loads
document.addEventListener('DOMContentLoaded', initializePopup);