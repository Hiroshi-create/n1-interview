"use client";

import { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaTrash, FaRegChartBar } from "react-icons/fa";

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

const VerticalAnalysisBar = ({ label, value, zScore }: { label: string; value: string; zScore: number }) => {
    const barColor = zScore >= 0 ? 'bg-red-400' : 'bg-blue-400';
    const barHeight = Math.min(Math.abs(zScore) / 2.5, 1) * 50; 
    const barStyle = {
        height: `${barHeight}%`,
        ...(zScore >= 0 ? { bottom: '50%' } : { top: '50%' })
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-12 h-24 bg-gray-200 rounded-lg overflow-hidden">
                <div className="absolute top-1/2 left-0 w-full h-px bg-gray-400/80"></div>
                <div className={`absolute left-0 w-full transition-all duration-300 ease-out ${barColor}`} style={barStyle}></div>
            </div>
            <div className="text-center">
                <div className="text-xs font-medium text-gray-500">{label}</div>
                <div className={`text-sm font-bold ${zScore > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {zScore > 0 ? `+${value}` : value}
                </div>
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
    const resetRequested = useRef(false);

    // --- 接続・切断・リソース管理ロジック (変更なし) ---
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
                if (resetRequested.current) {
                    websocketRef.current?.send(JSON.stringify({ action: "reset" }));
                    resetRequested.current = false;
                }
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
            websocketRef.current.onclose = () => { stopRecordingResources(); };
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
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({ action: "stop" }));
            websocketRef.current.close();
        }
        stopRecordingResources();
    };

    const handleToggleRecording = () => {
        if (isRecording) disconnect();
        else connect();
    };

    const handleReset = () => {
        setResults([]);
        setInterimTranscript("");
        if (isRecording) {
            if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                websocketRef.current.send(JSON.stringify({ action: "reset" }));
                websocketRef.current.close();
            }
            stopRecordingResources();
        } else {
            resetRequested.current = true;
        }
    };
    
    useEffect(() => {
        return () => {
            if (websocketRef.current) websocketRef.current.close();
            stopRecordingResources();
        };
    }, []);

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <div className="container mx-auto p-4 md:p-8 pb-16">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-800">リアルタイム音声分析</h1>
                    <p className="text-gray-500 mt-2">あなたの声を知る、新しい体験を。</p>
                </header>
                
                {/* ▼▼▼【修正箇所】▼▼▼ */}
                {/* コントロールパネルに sticky, top, z-index, backdrop-blur を追加してスクロールに追従させる */}
                <div className="sticky top-4 z-50 bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-6 mb-8 flex flex-col sm:flex-row justify-center items-center gap-6">
                {/* ▲▲▲【修正箇所】▲▲▲ */}
                    <button
                        onClick={handleToggleRecording}
                        className={`w-20 h-20 rounded-full text-white flex justify-center items-center transition-all duration-300 ease-in-out shadow-md focus:outline-none focus:ring-4 ${
                            isRecording 
                                ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300' 
                                : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300'
                        }`}
                        aria-label={isRecording ? '録音を停止' : '録音を開始'}
                    >
                        {isRecording ? <FaMicrophoneSlash size={32} /> : <FaMicrophone size={32} />}
                    </button>
                    <div className="text-center sm:text-left">
                        <p className="text-lg font-semibold text-gray-700">
                            {isRecording ? "録音中..." : "録音を開始してください"}
                        </p>
                        <p className="text-sm text-gray-500">マイクアイコンをクリックして開始/停止</p>
                    </div>
                </div>

                <div className="bg-white shadow-lg rounded-xl p-6 mb-40 min-h-[300px]">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-700">分析結果</h2>
                        <button
                            onClick={handleReset}
                            disabled={results.length === 0 && !interimTranscript}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                            aria-label="分析履歴をリセット"
                        >
                            <FaTrash />
                            リセット
                        </button>
                    </div>
                    
                    {results.length === 0 && !interimTranscript && (
                        <div className="text-center text-gray-400 py-16 flex flex-col items-center gap-4">
                            <FaRegChartBar size={48} />
                            <p className="font-semibold">分析データがありません</p>
                            <p className="text-sm">録音を開始すると、ここに分析結果が表示されます。</p>
                        </div>
                    )}

                    <div className="flex flex-wrap justify-center gap-4">
                        {results.map((result) => (
                            <div key={`${result.start}-${result.text}`} className="bg-gray-50 rounded-xl p-4 w-full sm:w-48 flex-shrink-0 shadow-sm border border-gray-200 transform hover:-translate-y-1 transition-transform duration-200">
                                <p className="font-bold text-lg text-gray-800 text-center mb-4 break-words">{result.text}</p>
                                <div className="flex justify-center items-start gap-6">
                                   <VerticalAnalysisBar label="音高" value={result.pitch_zscore.toFixed(2)} zScore={result.pitch_zscore} />
                                   <VerticalAnalysisBar label="音量" value={result.volume_zscore.toFixed(2)} zScore={result.volume_zscore} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {isRecording && interimTranscript && (
                        <div className="mt-6 border-t border-gray-200 pt-4">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">認識中...</h3>
                            <p className="text-gray-600 italic">{interimTranscript}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
