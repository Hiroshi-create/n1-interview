import React, { useRef, useState, useCallback, useEffect } from "react";
import { useChat } from "../users/Chat";
import { useAppsContext } from "@/context/AppContext";
import BallTriangle from 'react-loading-icons';
import Timer from "@/context/components/ui/timer";
import { getDoc } from "firebase/firestore";
import { FaMicrophoneAlt } from "react-icons/fa";

interface UIProps {
  hidden?: boolean;
  [key: string]: unknown;
}

export const UI: React.FC<UIProps> = ({ hidden }) => {
  const [initialTime, setInitialTime] = useState(0);
  const { selectedInterviewRef } = useAppsContext();

  useEffect(() => {
    const fetchThemeData = async () => {
      if (selectedInterviewRef) {
        try {
          const docSnap = await getDoc(selectedInterviewRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.interviewDurationMin) {
              setInitialTime(data.interviewDurationMin * 60);
            }
          }
        } catch (error) {
          console.error("Error getting document:", error);
        }
      }
    };
    
    fetchThemeData();
  }, [selectedInterviewRef]);

  const input = useRef<HTMLInputElement>(null);
  const { chat, isLoading, isPaused, setIsPaused, isTimerStarted, message, themeId } = useChat();
  const { micPermission, requestMicPermission, setHasInteracted, initializeAudioContext } = useAppsContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const chunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prevIsPaused => !prevIsPaused);
  }, []);

  const sendMessage = () => {
    console.log("メッセージの時" + themeId);
    if (input.current && !isLoading && !message) {
      const text = input.current.value;
      console.log(text);
      chat(text);
      input.current.value = "";
    }
  };

  const sendAudioToWhisper = useCallback(async (audioBlob: Blob, currentThemeId: string) => {
    console.log("音声入力の時" + currentThemeId);
    setIsProcessingAudio(true);
    const formData = new FormData();
    formData.append('file', audioBlob, `audio.${isIOS ? 'mp4' : 'webm'}`);
    formData.append('themeId', currentThemeId || '');
  
    try {
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
  }, [chat, themeId, isIOS]);

  const initializeMediaRecorder = async (stream: MediaStream) => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: isIOS ? 'audio/mp4' : 'audio/webm'
    });
    mediaRecorderRef.current = mediaRecorder;

    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
        console.log("音声チャンクサイズ:", event.data.size);
      }
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const audioBlob = new Blob(chunksRef.current, { type: isIOS ? 'audio/mp4' : 'audio/webm' });
      console.log("総音声サイズ:", audioBlob.size);
      await sendAudioToWhisper(audioBlob, themeId || '');
    };

    await new Promise<void>((resolve) => {
      mediaRecorder.onstart = () => {
        resolve();
      };
      mediaRecorder.start(1000);
    });

    setIsRecording(true);
    console.log("録音が開始されました");
  };

  const startRecording = useCallback(async () => {
    try {
      let hasPermission = micPermission;
      
      // 許可されていない場合は許可を要求
      if (!hasPermission) {
        hasPermission = await requestMicPermission();
        if (!hasPermission) {
          console.error("マイクの使用が許可されませんでした");
          return;
        }
      }

      // 許可された後、ストリームを取得
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await initializeMediaRecorder(stream);
    } catch (error) {
      console.error("録音の開始中にエラーが発生しました:", error);
    }
  }, [micPermission, requestMicPermission, themeId, isIOS]);

  const stopRecording = async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) {
      console.error("MediaRecorderが初期化されていません");
      return;
    }
  
    try {
      setHasInteracted(true);
      await initializeAudioContext();
      mediaRecorder.stop();
      setIsProcessingAudio(true);
    } catch (error) {
      console.error("録音停止処理エラー:", error);
      setIsProcessingAudio(false);
    }
  };

  // if (hidden) {
  //   return null;
  // }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        <div className="w-full flex justify-end">
          <div className="flex items-center">
            <div className="w-40 h-40 flex items-center justify-center pointer-events-auto">
              <Timer 
                isStarted={isTimerStarted} 
                initialTime={initialTime} 
                isPaused={isPaused}
                onTogglePause={togglePause}
              />
            </div>
          </div>
        </div>
  
        <div className="flex flex-col items-center gap-2 pointer-events-auto w-full mx-auto">
          {!hidden && (
            <div className="flex items-center gap-2 max-w-screen-sm w-full">
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
              <button
                disabled={isLoading || !!message}
                onClick={sendMessage}
                className={`w-24 bg-pink-500 hover:bg-pink-600 text-white p-4 font-semibold uppercase rounded-md ${
                  isLoading || !!message ? "cursor-not-allowed opacity-30" : ""
                }`}
              >
                送信
              </button>
            </div>
          )}
          
          <div className="fixed inset-0 z-10 pointer-events-none">
            <div 
              className="absolute pointer-events-auto"
              style={{
                left: '50%',
                bottom: '5%',
                transform: `translate(${-0.68 * 100}%, ${0 * 100}%)`,
              }}
            >
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || isProcessingAudio || !!message}
                className={`w-48 h-32 bg-blue-500 hover:bg-blue-600 text-white rounded-3xl flex items-center justify-center ${
                  isLoading || isProcessingAudio || !!message ? "cursor-not-allowed opacity-30" : ""
                }`}
              >
                {isRecording || isProcessingAudio ? (
                  <BallTriangle.Bars width="80" height="80" />
                ) : (
                  <FaMicrophoneAlt size={80} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};