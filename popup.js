let isRecording = false;

function updatePopupState(recording, isMeeting) {
  const startButton = document.getElementById('startRecord');
  const stopButton = document.getElementById('stopRecord');
  const statusDiv = document.getElementById('status');
  const recordingOptions = document.querySelectorAll('input[name="recordingType"]');

  if (!isMeeting) {
    statusDiv.textContent = 'No meeting detected';
    startButton.disabled = true;
    stopButton.disabled = true;
    recordingOptions.forEach(option => option.disabled = true);
    return;
  }

  if (recording) {
    startButton.disabled = true;
    stopButton.disabled = false;
    recordingOptions.forEach(option => option.disabled = true);
    statusDiv.textContent = 'Recording...';
  } else {
    startButton.disabled = false;
    stopButton.disabled = true;
    recordingOptions.forEach(option => option.disabled = false);
    statusDiv.textContent = 'Meeting detected';
  }
}

function initializePopup() {
  const startButton = document.getElementById('startRecord');
  const stopButton = document.getElementById('stopRecord');
  const statusDiv = document.getElementById('status');

  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (!tabs[0]) {
      updatePopupState(false, false);
      return;
    }
    
    const url = tabs[0].url;
    const isMeeting = url.includes('meet.google.com') || url.includes('zoom.us');
    
    chrome.storage.local.get(['isRecording'], (result) => {
      isRecording = result.isRecording || false;
      updatePopupState(isRecording, isMeeting);
    });

    if (isMeeting) {
      startButton.addEventListener('click', () => {
        const recordingType = document.querySelector('input[name="recordingType"]:checked').value;
        isRecording = true;
        chrome.storage.local.set({ isRecording: true });
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'startRecording',
          recordingType: recordingType
        });
        updatePopupState(true, isMeeting);
      });

      stopButton.addEventListener('click', () => {
        isRecording = false;
        chrome.storage.local.set({ isRecording: false });
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopRecording' }, () => {
          if (chrome.runtime.lastError) {
            console.warn("Content script is not available. Reinjecting...");
          }
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["content.js"]
          }).then(() => {
            console.log("Content script reloaded successfully.");
            updatePopupState(false, isMeeting);
          }).catch(err => console.error("Failed to reload content script:", err));
        });
      });
      
    }
  });
}

document.addEventListener('DOMContentLoaded', initializePopup);