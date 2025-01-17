import React, { useRef, useState, useCallback, useEffect } from "react";
import { useChat } from "../users/Chat";
import { useAppsContext } from "@/context/AppContext";
import BallTriangle from 'react-loading-icons';

interface UIProps {
  hidden?: boolean;
  [key: string]: unknown;
}

export const UI: React.FC<UIProps> = ({ hidden }) => {
  const input = useRef<HTMLInputElement>(null);
  const { chat, isLoading, cameraZoomed, setCameraZoomed, message, themeId } = useChat();
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
  // }, [sendAudioToWhisper, themeId, isIOS]);

  const stopRecording = async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) {
      console.error("MediaRecorderが初期化されていません");
      return;
    }
  
    try {
      setHasInteracted(true);
      // AudioContextの初期化を確実に行う
      await initializeAudioContext();
      mediaRecorder.stop();
      setIsProcessingAudio(true);
    } catch (error) {
      console.error("録音停止処理エラー:", error);
      setIsProcessingAudio(false);
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
















// import React, { useRef, useState, useCallback } from "react";
// import { useChat } from "../users/Chat";
// import BallTriangle from 'react-loading-icons';

// interface UIProps {
//   hidden?: boolean;
//   [key: string]: unknown;
// }

// export const UI: React.FC<UIProps> = ({ hidden }) => {
//   const input = useRef<HTMLInputElement>(null);
//   const { chat, isLoading, cameraZoomed, setCameraZoomed, message, themeId } = useChat();
//   const [isRecording, setIsRecording] = useState(false);
//   const [isProcessingAudio, setIsProcessingAudio] = useState(false);
//   const chunksRef = useRef<Blob[]>([]);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);

//   const sendMessage = () => {
//     console.log("メッセージの時" + themeId);
//     if (input.current && !isLoading && !message) {
//       const text = input.current.value;
//       console.log(text);
//       chat(text);
//       input.current.value = "";
//     }
//   };

//   const sendAudioToWhisper = useCallback(async (audioBlob: Blob, currentThemeId: string) => {
//     console.log("音声入力の時" + currentThemeId);
//     setIsProcessingAudio(true);
//     const formData = new FormData();
//     formData.append('file', audioBlob, 'audio.webm');
//     formData.append('themeId', currentThemeId || '');
  
//     try {
//       const response = await fetch('/api/transcribe', {
//         method: 'POST',
//         body: formData,
//       });
  
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
//       }
  
//       const data = await response.json();
//       console.log('Whisper API response received in frontend:', data);
  
//       if (data.text) {
//         console.log(data.text);
//         chat(data.text);
//         console.log('Transcribed text:', data.text);
//       } else {
//         console.error('No transcribed text in the response');
//       }
//     } catch (error) {
//       console.error('Error sending audio to Whisper:', error);
//     } finally {
//       setIsProcessingAudio(false);
//       setIsRecording(false);
//     }
//   }, [chat, themeId]);

//   const startRecording = useCallback(async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       const mediaRecorder = new MediaRecorder(stream);
//       mediaRecorderRef.current = mediaRecorder;

//       chunksRef.current = [];

//       mediaRecorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           chunksRef.current.push(event.data);
//           console.log("Audio chunk size:", event.data.size);
//         }
//       };

//       mediaRecorder.onstop = async () => {
//         await new Promise(resolve => setTimeout(resolve, 100));
        
//         const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
//         console.log("Total audio size:", audioBlob.size);
//         await sendAudioToWhisper(audioBlob, themeId || '');
//       };

//       mediaRecorder.start(1000);
//       setIsRecording(true);
//     } catch (error) {
//       console.error("Error starting recording:", error);
//     }
//   }, [sendAudioToWhisper, themeId]);

//   const stopRecording = () => {
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stop();
//       setIsProcessingAudio(true);  // 録音停止時にも処理中フラグを立てる
//     }
//   };

//   if (hidden) {
//     return null;
//   }

//   return (
//     <>
//       <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
//         <div className="w-full flex flex-col items-end justify-center gap-4">
//           <button
//             onClick={() => setCameraZoomed(!cameraZoomed)}
//             className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
//           >
//             {cameraZoomed ? (
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 strokeWidth={1.5}
//                 stroke="currentColor"
//                 className="w-6 h-6"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
//                 />
//               </svg>
//             ) : (
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 strokeWidth={1.5}
//                 stroke="currentColor"
//                 className="w-6 h-6"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
//                 />
//               </svg>
//             )}
//           </button>
//         </div>
//         <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
//           <input
//             className="w-full placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
//             placeholder="Type a message..."
//             ref={input}
//             onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
//               if (e.key === "Enter") {
//                 sendMessage();
//               }
//             }}
//           />
//           <div className="flex-shrink-0 flex gap-2">
//             <button
//               disabled={isLoading || !!message}
//               onClick={sendMessage}
//               className={`w-24 bg-pink-500 hover:bg-pink-600 text-white p-4 font-semibold uppercase rounded-md ${
//                 isLoading || !!message ? "cursor-not-allowed opacity-30" : ""
//               }`}
//             >
//               送信
//             </button>
//             <button
//               onClick={isRecording ? stopRecording : startRecording}
//               disabled={isLoading || isProcessingAudio}
//               className={`w-24 bg-blue-500 hover:bg-blue-600 text-white p-4 font-semibold uppercase rounded-md ${
//                 isLoading || isProcessingAudio ? "cursor-not-allowed opacity-30" : ""
//               }`}
//             >
//               {isRecording || isProcessingAudio ? (
//                 <div className="flex items-center justify-center w-full h-full">
//                   <BallTriangle.Bars width="20" height="20" />
//                 </div>
//               ) : (
//                 "音声"
//               )}
//             </button>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };