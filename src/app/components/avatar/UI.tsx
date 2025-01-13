import React, { useRef, useState, useCallback } from "react";
import { useChat } from "../users/Chat";
import BallTriangle from 'react-loading-icons';

interface UIProps {
  hidden?: boolean;
  [key: string]: unknown;
}

export const UI: React.FC<UIProps> = ({ hidden }) => {
  const input = useRef<HTMLInputElement>(null);
  const { chat, isLoading, cameraZoomed, setCameraZoomed, message, themeId } = useChat();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const chunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const sendMessage = () => {
    console.log("メッセージの時" + themeId);
    if (input.current && !isLoading && !message) {
      const text = input.current.value;
      console.log(text);
      chat(text);
      input.current.value = "";
    }
  };

  const convertToWebm = async (audioBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );

          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start(0);

          const renderedBuffer = await offlineContext.startRendering();
          const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);

          resolve(new Blob([wavBlob], { type: 'audio/webm' }));
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = (error) => reject(error);
      fileReader.readAsArrayBuffer(audioBlob);
    });
  };

  const bufferToWave = (abuffer: AudioBuffer, len: number) => {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < abuffer.numberOfChannels; i++)
      channels.push(abuffer.getChannelData(i));

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return buffer;

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  };

  const sendAudioToWhisper = useCallback(async (audioBlob: Blob, currentThemeId: string) => {
    console.log("音声入力の時" + currentThemeId);
    setIsProcessingAudio(true);

    try {
      let webmBlob = audioBlob;
      if (audioBlob.type !== 'audio/webm') {
        console.log('Converting audio to webm format');
        webmBlob = await convertToWebm(audioBlob);
      }

      const formData = new FormData();
      formData.append('file', webmBlob, 'audio.webm');
      formData.append('themeId', currentThemeId || '');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Whisper API response received in frontend:', data);

      if (data.text) {
        console.log(data.text);
        chat(data.text);
        console.log('Transcribed text:', data.text);
      } else {
        console.error('No transcribed text in the response');
      }
    } catch (error) {
      console.error('Error sending audio to Whisper:', error);
    } finally {
      setIsProcessingAudio(false);
      setIsRecording(false);
    }
  }, [chat, themeId]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log("Audio chunk size:", event.data.size);
        }
      };

      mediaRecorder.onstop = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        console.log("Total audio size:", audioBlob.size);
        await sendAudioToWhisper(audioBlob, themeId || '');
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  }, [sendAudioToWhisper, themeId]);

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsProcessingAudio(true);
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        <div className="w-full flex flex-col items-end justify-center gap-4">
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
          >
            {cameraZoomed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
          <input
            className="w-full placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
            placeholder="Type a message..."
            ref={input}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />
          <div className="flex-shrink-0 flex gap-2">
            <button
              disabled={isLoading || !!message}
              onClick={sendMessage}
              className={`w-24 bg-pink-500 hover:bg-pink-600 text-white p-4 font-semibold uppercase rounded-md ${
                isLoading || !!message ? "cursor-not-allowed opacity-30" : ""
              }`}
            >
              送信
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isProcessingAudio}
              className={`w-24 bg-blue-500 hover:bg-blue-600 text-white p-4 font-semibold uppercase rounded-md ${
                isLoading || isProcessingAudio ? "cursor-not-allowed opacity-30" : ""
              }`}
            >
              {isRecording || isProcessingAudio ? (
                <div className="flex items-center justify-center w-full h-full">
                  <BallTriangle.Bars width="20" height="20" />
                </div>
              ) : (
                "音声"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};