"use client";

import { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";

// --- 定数と型定義 ---
const WEBSOCKET_URL = "ws://127.0.0.1:8000/ws";
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 2048;

interface BunsetsuData {
  text: string;
  pitch: number;
  volume: number;
  pitch_zscore: number;
  volume_zscore: number;
  start: number;
}

interface WebSocketMessage {
  type: 'final_analysis' | 'interim_transcript';
  data?: BunsetsuData[];
  transcript?: string;
}

// 縦型のダイバージング・バーコンポーネント (変更なし)
const VerticalAnalysisBar = ({ label, value, zScore }: { label: string; value: string; zScore: number }) => {
    const barColor = zScore >= 0 ? '#d9534f' : '#428bca';
    const barHeight = Math.min(Math.abs(zScore) / 2.0, 1) * 50;
    const barStyle = {
        position: 'absolute' as 'absolute',
        left: 0,
        right: 0,
        height: `${barHeight}%`,
        backgroundColor: barColor,
        transition: 'all 0.3s ease-in-out',
        ...(zScore >= 0 ? { bottom: '50%' } : { top: '50%' })
    };

    return (
        <div className="relative w-16 h-24 bg-gray-200 mx-auto">
            <div className="absolute top-0 bottom-0 left-0 right-0 border-t border-gray-400" style={{ top: '50%' }}></div>
            <div style={barStyle}></div>
            <div className="absolute bottom-1 left-0 right-0 text-center text-xs">
                <div>{label}</div>
                {/* ＋/−の符号も表示されるように修正 */}
                <div>{parseFloat(value) > 0 ? `+${value}` : value}</div>
            </div>
        </div>
    );
};


export default function SpeechRecognition() {
    const [isRecording, setIsRecording] = useState(false);
    const [results, setResults] = useState<BunsetsuData[]>([]);
    const [interimTranscript, setInterimTranscript] = useState("");

    const websocketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const connect = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const context = new AudioContext({ sampleRate: SAMPLE_RATE });
            audioContextRef.current = context;

            const source = context.createMediaStreamSource(stream);
            const processor = context.createScriptProcessor(BUFFER_SIZE, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    let s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                    websocketRef.current.send(pcm16.buffer);
                }
            };

            source.connect(processor);
            processor.connect(context.destination);

            websocketRef.current = new WebSocket(WEBSOCKET_URL);
            websocketRef.current.onopen = () => {
                console.log("WebSocket接続が確立しました。");
                setIsRecording(true);
                setInterimTranscript("");
            };

            websocketRef.current.onmessage = (event) => {
                const message: WebSocketMessage = JSON.parse(event.data);
                if (message.type === 'final_analysis' && message.data) {
                    setResults(message.data);
                    setInterimTranscript("");
                } else if (message.type === 'interim_transcript' && message.transcript) {
                    setInterimTranscript(message.transcript);
                }
            };

            websocketRef.current.onclose = () => {
                console.log("WebSocket接続が閉じられました。");
                stopRecordingResources();
            };

            websocketRef.current.onerror = (error) => {
                console.error("WebSocketエラー:", error);
                stopRecordingResources();
            };

        } catch (error) {
            console.error("マイクへのアクセスに失敗しました:", error);
        }
    };

    const stopRecordingResources = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        setIsRecording(false);
    };

    const disconnect = () => {
        if (websocketRef.current) {
            websocketRef.current.close();
        }
    };

    const handleToggleRecording = () => {
        if (isRecording) {
            disconnect();
        } else {
            connect();
        }
    };

    useEffect(() => {
        return () => {
            if (websocketRef.current) {
                websocketRef.current.close();
            }
            stopRecordingResources();
        };
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">リアルタイム音声分析</h1>

            <div className="text-center mb-4">
                <button
                    onClick={handleToggleRecording}
                    className={`p-4 rounded-full text-white transition-colors ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                >
                    {isRecording ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} />}
                </button>
                <p className="mt-2 text-sm text-gray-600">{isRecording ? "録音中..." : "クリックして録音開始"}</p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-4 min-h-[200px]">
                <h2 className="text-lg font-semibold border-b pb-2 mb-2">分析結果</h2>

                <div className="flex flex-wrap gap-4">
                    {results.map((result) => (
                        <div key={`${result.start}-${result.text}`} className="p-2 border rounded-md shadow-sm bg-gray-50 text-center">
                            <p className="font-semibold text-lg mb-2">{result.text}</p>
                            <div className="flex gap-2">
                               {/* 表示する値を、生のHz値から標準化されたZ-scoreに変更 */}
                               <VerticalAnalysisBar label="音高" value={result.pitch_zscore.toFixed(2)} zScore={result.pitch_zscore} />
                               <VerticalAnalysisBar label="音量" value={result.volume_zscore.toFixed(2)} zScore={result.volume_zscore} />
                            </div>
                        </div>
                    ))}
                </div>

                {isRecording && interimTranscript && (
                    <div className="mt-4 p-2 text-gray-500">
                        <p>{interimTranscript}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
