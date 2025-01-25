let mediaRecorder = null;
let recordedChunks = [];

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startRecording') {
    startRecording(request.recordingType);
  } else if (request.action === 'stopRecording') {
    stopRecording();
  }
});

// Check recording state when content script loads
chrome.storage.local.get(['isRecording'], (result) => {
  if (result.isRecording) {
    startRecording('audio'); // Default to audio if state is restored
  }
});

async function startRecording(recordingType) {
  try {
    let stream;
    const options = {
      mimeType: 'video/webm;codecs=vp8,opus'
    };

    if (recordingType === 'audio') {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      options.mimeType = 'audio/webm;codecs=opus';
    } else {
      try {
        // First get screen stream with system audio
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true // This captures system audio
        });

        // Then get microphone audio
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });

        // Get all tracks
        const tracks = [
          ...screenStream.getVideoTracks(),
          ...screenStream.getAudioTracks(), // System audio
          ...micStream.getAudioTracks() // Microphone audio
        ];

        stream = new MediaStream(tracks);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        throw new Error('Failed to access screen or audio devices');
      }
    }
    
    mediaRecorder = new MediaRecorder(stream, options);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const mimeType = recordingType === 'audio' ? 'audio/mp3' : 'video/webm';
      const fileExtension = recordingType === 'audio' ? 'mp3' : 'webm';
      
      // Create a blob from the recorded chunks
      const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
      
      // Convert to MP3 if it's audio only
      const finalBlob = recordingType === 'audio' ? 
        await convertToFinalFormat(blob, recordingType) : 
        blob;
      
      // Download the recording
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-recording-${new Date().toISOString()}.${fileExtension}`;
      a.click();
      URL.revokeObjectURL(url);
      
      recordedChunks = [];
    };

    mediaRecorder.start(1000); // Capture in 1-second chunks
    chrome.storage.local.set({ isRecording: true });
  } catch (error) {
    console.error('Error starting recording:', error);
    chrome.storage.local.set({ isRecording: false });
    throw error; // Re-throw to handle in the popup
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    chrome.storage.local.set({ isRecording: false });
  }
}

async function convertToFinalFormat(blob, recordingType) {
  if (recordingType === 'audio') {
    // Convert to MP3 using the existing audio conversion logic
    const audioContext = new AudioContext();
    const audioBuffer = await blob.arrayBuffer();
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
    return audioBufferToMp3(renderedBuffer);
  } else {
    return blob;
  }
}

function audioBufferToMp3(audioBuffer) {
  const wavBlob = audioBufferToWav(audioBuffer);
  return new Blob([wavBlob], { type: 'audio/mp3' });
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