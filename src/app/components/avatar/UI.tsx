import React, { useRef, useState, useCallback } from "react";
import { useChat } from "../Chat";
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

  const sendAudioToWhisper = useCallback(async (audioBlob: Blob, currentThemeId: string) => {
    console.log("音声入力の時" + currentThemeId);
    setIsProcessingAudio(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
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
      setIsProcessingAudio(true);  // 録音停止時にも処理中フラグを立てる
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
              disabled={isProcessingAudio}
              className={`w-24 bg-blue-500 hover:bg-blue-600 text-white p-4 font-semibold uppercase rounded-md ${
                isProcessingAudio ? "cursor-not-allowed opacity-30" : ""
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
































// // テキスト入力のみ


// import React, { useRef } from "react";
// import { useChat } from "../Chat";

// interface UIProps {
//   hidden?: boolean;
//   [key: string]: unknown;
// }

// export const UI: React.FC<UIProps> = ({ hidden }) => {
//   const input = useRef<HTMLInputElement>(null);
//   const { chat, isLoading, cameraZoomed, setCameraZoomed, message } = useChat();

//   const sendMessage = () => {
//     if (input.current && !isLoading && !message) {
//       const text = input.current.value;
//       chat(text);
//       input.current.value = "";
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
//           <button
//             disabled={isLoading || !!message}
//             onClick={sendMessage}
//             className={`bg-pink-500 hover:bg-pink-600 text-white p-4 px-10 font-semibold uppercase rounded-md ${
//                 isLoading || !!message ? "cursor-not-allowed opacity-30" : ""
//             }`}
//           >
//             Send
//           </button>
//         </div>
//       </div>
//     </>
//   );
// };














// // // jsx

// // // import { useRef } from "react";
// // // import { useChat } from "../Chat";

// // // export const UI = ({ hidden, ...props }) => {
// // //   const input = useRef();
// // //   const { chat, loading, cameraZoomed, setCameraZoomed, message } = useChat();

// // //   const sendMessage = () => {
// // //     const text = input.current.value;
// // //     if (!loading && !message) {
// // //       chat(text);
// // //       input.current.value = "";
// // //     }
// // //   };
// // //   if (hidden) {
// // //     return null;
// // //   }

// // //   return (
// // //     <>
// // //       <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
// // //         {/* <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg">
// // //           <h1 className="font-black text-xl">My Virtual GF</h1>
// // //           <p>I will always love you ❤️</p>
// // //         </div> */}
// // //         <div className="w-full flex flex-col items-end justify-center gap-4">
// // //           <button
// // //             onClick={() => setCameraZoomed(!cameraZoomed)}
// // //             className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
// // //           >
// // //             {cameraZoomed ? (
// // //               <svg
// // //                 xmlns="http://www.w3.org/2000/svg"
// // //                 fill="none"
// // //                 viewBox="0 0 24 24"
// // //                 strokeWidth={1.5}
// // //                 stroke="currentColor"
// // //                 className="w-6 h-6"
// // //               >
// // //                 <path
// // //                   strokeLinecap="round"
// // //                   strokeLinejoin="round"
// // //                   d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
// // //                 />
// // //               </svg>
// // //             ) : (
// // //               <svg
// // //                 xmlns="http://www.w3.org/2000/svg"
// // //                 fill="none"
// // //                 viewBox="0 0 24 24"
// // //                 strokeWidth={1.5}
// // //                 stroke="currentColor"
// // //                 className="w-6 h-6"
// // //               >
// // //                 <path
// // //                   strokeLinecap="round"
// // //                   strokeLinejoin="round"
// // //                   d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
// // //                 />
// // //               </svg>
// // //             )}
// // //           </button>
// // //           <button
// // //             onClick={() => {
// // //               const body = document.querySelector("body");
// // //               if (body.classList.contains("greenScreen")) {
// // //                 body.classList.remove("greenScreen");
// // //               } else {
// // //                 body.classList.add("greenScreen");
// // //               }
// // //             }}
// // //             className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
// // //           >
// // //             <svg
// // //               xmlns="http://www.w3.org/2000/svg"
// // //               fill="none"
// // //               viewBox="0 0 24 24"
// // //               strokeWidth={1.5}
// // //               stroke="currentColor"
// // //               className="w-6 h-6"
// // //             >
// // //               <path
// // //                 strokeLinecap="round"
// // //                 d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
// // //               />
// // //             </svg>
// // //           </button>
// // //         </div>
// // //         <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
// // //           <input
// // //             className="w-full placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
// // //             placeholder="Type a message..."
// // //             ref={input}
// // //             onKeyDown={(e) => {
// // //               if (e.key === "Enter") {
// // //                 sendMessage();
// // //               }
// // //             }}
// // //           />
// // //           <button
// // //             disabled={loading || message}
// // //             onClick={sendMessage}
// // //             className={`bg-pink-500 hover:bg-pink-600 text-white p-4 px-10 font-semibold uppercase rounded-md ${
// // //               loading || message ? "cursor-not-allowed opacity-30" : ""
// // //             }`}
// // //           >
// // //             Send
// // //           </button>
// // //         </div>
// // //       </div>
// // //     </>
// // //   );
// // // };