let mediaRecorder = null;
let audioChunks = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startRecording') {
    startRecording();
  } else if (request.action === 'stopRecording') {
    stopRecording();
  }
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-recording-${new Date().toISOString()}.webm`;
      a.click();
      audioChunks = [];
    };

    mediaRecorder.start();
  } catch (error) {
    console.error('Error starting recording:', error);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
}


