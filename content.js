let mediaRecorder = null;
let audioChunks = [];

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startRecording') {
    startRecording();
  } else if (request.action === 'stopRecording') {
    stopRecording();
  }
});

// Check recording state when content script loads
chrome.storage.local.get(['isRecording'], (result) => {
  if (result.isRecording) {
    startRecording();
  }
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const options = {
      mimeType: 'audio/mpeg',
      audioBitsPerSecond: 128000
    };

    if (!MediaRecorder.isTypeSupported('audio/mpeg')) {
      options.mimeType = 'audio/webm';
    }
    
    mediaRecorder = new MediaRecorder(stream, options);
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      
      if (mediaRecorder.mimeType !== 'audio/mpeg') {
        const audioContext = new AudioContext();
        const audioBuffer = await audioBlob.arrayBuffer();
        const audioData = await audioContext.decodeAudioData(audioBuffer);
        
        const offlineContext = new OfflineAudioContext(
          audioData.numberOfChannels,
          audioData.length,
          audioData.sampleRate
        );
        
        const source = offlineContext.createBufferSource();
        source.buffer = audioData;
        source.connect(offlineContext.destination);
        source.start();
        
        const renderedBuffer = await offlineContext.startRendering();
        const mp3Blob = await convertToMp3Format(renderedBuffer);
        downloadAudio(mp3Blob);
      } else {
        downloadAudio(audioBlob);
      }
      
      audioChunks = [];
    };

    mediaRecorder.start();
    // Set recording state
    chrome.storage.local.set({ isRecording: true });
  } catch (error) {
    console.error('Error starting recording:', error);
    chrome.storage.local.set({ isRecording: false });
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    chrome.storage.local.set({ isRecording: false });
  }
}

function downloadAudio(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meeting-recording-${new Date().toISOString()}.mp3`;
  a.click();
  URL.revokeObjectURL(url);
}

async function convertToMp3Format(audioBuffer) {
  const wavBlob = await audioBufferToWav(audioBuffer);
  return wavBlob;
}

function audioBufferToWav(audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  
  const buffer = audioBuffer.getChannelData(0);
  const samples = buffer.length;
  const dataSize = samples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const arrayBuffer = new ArrayBuffer(totalSize);
  const dataView = new DataView(arrayBuffer);
  
  writeString(dataView, 0, 'RIFF');
  dataView.setUint32(4, totalSize - 8, true);
  writeString(dataView, 8, 'WAVE');
  writeString(dataView, 12, 'fmt ');
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, format, true);
  dataView.setUint16(22, numberOfChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * blockAlign, true);
  dataView.setUint16(32, blockAlign, true);
  dataView.setUint16(34, bitDepth, true);
  writeString(dataView, 36, 'data');
  dataView.setUint32(40, dataSize, true);
  
  const offset = 44;
  for (let i = 0; i < samples; i++) {
    const sample = Math.max(-1, Math.min(1, buffer[i]));
    dataView.setInt16(offset + i * 2, sample * 0x7FFF, true);
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(dataView, offset, string) {
  for (let i = 0; i < string.length; i++) {
    dataView.setUint8(offset + i, string.charCodeAt(i));
  }
}