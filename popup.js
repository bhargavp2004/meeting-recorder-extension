let isRecording = false;

function initializePopup() {
  const startButton = document.getElementById('startRecord');
  const stopButton = document.getElementById('stopRecord');
  const statusDiv = document.getElementById('status');

  // Get the current tab, whether we're in a popup window or browser action popup
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (!tabs[0]) return; // Exit if no active tab found
    
    const url = tabs[0].url;
    const isMeeting = url.includes('meet.google.com') || url.includes('zoom.us');
    
    if (isMeeting) {
      statusDiv.textContent = 'Meeting detected';
      startButton.disabled = false;
      
      startButton.addEventListener('click', () => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startRecording' });
        startButton.disabled = true;
        stopButton.disabled = false;
        statusDiv.textContent = 'Recording...';
      });

      stopButton.addEventListener('click', () => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopRecording' });
        startButton.disabled = false;
        stopButton.disabled = true;
        statusDiv.textContent = 'Recording stopped';
      });
    }
  });
}

// Initialize as soon as the popup loads
document.addEventListener('DOMContentLoaded', initializePopup);
