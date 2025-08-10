"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaTrash, FaRegChartBar, FaTachometerAlt, FaVial, FaStream, FaPauseCircle, FaHourglassHalf } from "react-icons/fa";

// --- 定数と型定義 ---
const WEBSOCKET_URL = "ws://127.0.0.1:8000/ws";
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 2048;

// ▼▼▼ 修正箇所: ポーズ関連のデータを追加 ▼▼▼
interface BunsetsuData {
  text: string;
  pitch: number;
  volume: number;
  start: number;
  speech_rate: number;
  jitter: number;
  shimmer: number;
  num_pauses: number;
  avg_pause_duration: number;
  pitch_zscore: number;
  volume_zscore: number;
  speech_rate_zscore: number;
  jitter_zscore: number;
  shimmer_zscore: number;
  num_pauses_zscore: number;
  avg_pause_duration_zscore: number;
}

interface GroupedAnalysis {
  speech_rate: number;
  jitter: number;
  shimmer: number;
  num_pauses: number;
  avg_pause_duration: number;
  speech_rate_zscore: number;
  jitter_zscore: number;
  shimmer_zscore: number;
  num_pauses_zscore: number;
  avg_pause_duration_zscore: number;
  bunsetsus: BunsetsuData[];
}
// ▲▲▲ 修正箇所ここまで ▲▲▲

interface WebSocketMessage {
  type: 'final_analysis' | 'interim_transcript';
  data?: BunsetsuData[];
  transcript?: string;
}

// --- UIヘルパーコンポーネント ---
const ZScoreBar = ({ value }: { value: number }) => {
  const maxAbsZ = 3.0;
  const percentage = Math.min(100, (Math.abs(value) / maxAbsZ) * 100);
  const isPositive = value >= 0;
  return (
    <div className="w-full bg-gray-700 rounded-full h-2 relative flex items-center justify-center">
      <div className="absolute w-px h-full bg-gray-500" style={{ left: '50%' }} />
      {isPositive ? (
        <div className="absolute bg-cyan-400 h-2 rounded-r-full" style={{ left: '50%', width: `${percentage / 2}%` }} />
      ) : (
        <div className="absolute bg-orange-400 h-2 rounded-l-full" style={{ right: '50%', width: `${percentage / 2}%` }} />
      )}
    </div>
  );
};

const getZScoreColor = (zscore: number): string => {
    if (zscore > 0.2) return "text-cyan-400";
    if (zscore < -0.2) return "text-orange-400";
    return "text-white";
};

const BaselineDisplay = ({ groupedResults }: { groupedResults: GroupedAnalysis[] }) => {
    const baselines = useMemo(() => {
        if (groupedResults.length === 0) return null;
        const calculateMeanStd = (arr: number[]) => {
            if (arr.length === 0) return { mean: 0, std: 0, n: 0 };
            const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
            const std = arr.length > 1 ? Math.sqrt(arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / (arr.length -1)) : 0;
            return { mean, std, n: arr.length };
        };
        // ▼▼▼ 修正箇所: ポーズ関連のベースライン計算を追加 ▼▼▼
        const rates = groupedResults.map(g => g.speech_rate).filter(v => v > 0);
        const jitters = groupedResults.map(g => g.jitter).filter(v => v > 0);
        const shimmers = groupedResults.map(g => g.shimmer).filter(v => v > 0);
        const numPauses = groupedResults.map(g => g.num_pauses);
        const avgPauseDurations = groupedResults.map(g => g.avg_pause_duration).filter(v => v > 0);
        const pitches = groupedResults.flatMap(g => g.bunsetsus.map(b => b.pitch)).filter(v => v > 0);
        const volumes = groupedResults.flatMap(g => g.bunsetsus.map(b => b.volume));

        return {
            pitch: calculateMeanStd(pitches),
            volume: calculateMeanStd(volumes),
            speech_rate: calculateMeanStd(rates),
            jitter: calculateMeanStd(jitters),
            shimmer: calculateMeanStd(shimmers),
            num_pauses: calculateMeanStd(numPauses),
            avg_pause_duration: calculateMeanStd(avgPauseDurations),
        };
        // ▲▲▲ 修正箇所ここまで ▲▲▲
    }, [groupedResults]);

    if (!baselines) return null;
    return (
      <div className="py-2 px-3 bg-gray-800/80 rounded border border-gray-700 flex items-start gap-8">
        <h2 className="text-2xl font-semibold text-gray-300 min-w-[120px] mt-1">
          現在のベースライン
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-3 text-xs flex-1">
          {(Object.keys(baselines) as (keyof typeof baselines)[]).map(key => {
            const { mean, std, n } = baselines[key];
            const labels = { pitch: "音高", volume: "音量", speech_rate: "話速", jitter: "Jitter", shimmer: "Shimmer", num_pauses: "ポーズ数", avg_pause_duration: "ポーズ長"};
            const units = { pitch: "Hz", volume: "", speech_rate: "字/秒", jitter: "", shimmer: "", num_pauses: "回", avg_pause_duration: "秒"};
            const precision = (key === 'jitter' || key === 'shimmer') ? 4 : (key === 'avg_pause_duration' ? 3 : 2);
            return (
              <div key={key}>
                <p className="font-bold text-gray-200">
                  {labels[key]} <span className="text-gray-500 font-normal">(N={n})</span>
                </p>
                <p className="text-gray-400">
                  平均: <span className="font-mono text-white">{mean.toFixed(precision)}</span> {units[key]}
                </p>
                <p className="text-gray-400">
                  標準偏差: <span className="font-mono text-white">{std.toFixed(precision)}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
};

// --- メインコンポーネント ---
export default function SpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<BunsetsuData[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { return () => { stopRecording(); socketRef.current?.close(); }; }, []);

  const connectWebSocket = () => {
    socketRef.current = new WebSocket(WEBSOCKET_URL);
    socketRef.current.onopen = () => console.log("WebSocket接続が確立しました。");
    socketRef.current.onclose = () => console.log("WebSocket接続が閉じました。");
    socketRef.current.onerror = (error) => console.error("WebSocketエラー:", error);
    socketRef.current.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      if (message.type === 'final_analysis' && message.data) {
        setAnalysisResults(message.data);
        setInterimTranscript("");
      } else if (message.type === 'interim_transcript' && message.transcript) {
        setInterimTranscript(message.transcript);
      }
    };
  };

  const startRecording = async () => {
    if (isRecording) return;
    try {
      connectWebSocket();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
        if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(int16.buffer);
      };
      source.connect(processor);
      processor.connect(context.destination);
      setIsRecording(true);
    } catch (error) { console.error("マイクへのアクセスに失敗しました:", error); alert("マイクへのアクセス許可が必要です。"); }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    streamRef.current?.getTracks().forEach(track => track.stop());
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ action: "stop" }));
    socketRef.current?.close();
    setIsRecording(false);
  };

  const resetAnalysis = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ action: "reset" }));
    setAnalysisResults([]);
    setInterimTranscript("");
  };

  const groupedResults: GroupedAnalysis[] = useMemo(() => {
    if (analysisResults.length === 0) return [];
    const groups: GroupedAnalysis[] = [];
    let currentGroup: GroupedAnalysis | null = null;
    for (const result of analysisResults) {
        if (!currentGroup || Math.abs(currentGroup.speech_rate - result.speech_rate) > 0.01) {
            if (currentGroup) groups.push(currentGroup);
            currentGroup = {
              speech_rate: result.speech_rate, jitter: result.jitter, shimmer: result.shimmer, num_pauses: result.num_pauses, avg_pause_duration: result.avg_pause_duration,
              speech_rate_zscore: result.speech_rate_zscore, jitter_zscore: result.jitter_zscore, shimmer_zscore: result.shimmer_zscore, num_pauses_zscore: result.num_pauses_zscore, avg_pause_duration_zscore: result.avg_pause_duration_zscore,
              bunsetsus: [result]
            };
        } else {
            currentGroup.bunsetsus.push(result);
        }
    }
    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [analysisResults]);

  return (
    <div className="flex flex-col bg-gray-900 text-white font-sans min-h-screen">
      <header className="p-4 border-b border-gray-700 shadow-md bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {/* タイトル */}
          <h1 className="text-2xl font-bold flex items-center flex-shrink-0 min-w-[180px]">
            <FaRegChartBar className="mr-3 text-cyan-400" />
            リアルタイム音声分析
          </h1>
          {/* インジケーター領域 */}
          <div className="px-4 py-2 bg-gray-800 rounded flex-1 min-w-0 flex flex-col justify-center">
            <h2 className="text-sm text-gray-400 mb-1 truncate">
              {isRecording ? "話してください..." : "録音を開始してください"}
            </h2>
            <p className="text-lg h-6 text-gray-100 truncate">{interimTranscript}</p>
          </div>
          {/* ボタン群 */}
          <div className="flex items-center space-x-4 flex-shrink-0 ml-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-full transition-colors duration-200 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
            >
              {isRecording ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
            </button>
            <button
              onClick={resetAnalysis}
              className="p-3 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors duration-200"
              title="分析履歴をリセット"
            >
              <FaTrash size={18} />
            </button>
          </div>
        </div>
        {/* BaselineDisplay を追加 */}
        <div className="mt-4">
          <BaselineDisplay groupedResults={groupedResults} />
        </div>
      </header>


      <main className="flex-1 flex flex-col min-h-0 overflow-hidden pb-16">
        <div className="flex-1 p-4 overflow-y-auto bg-gray-900 pb-8 min-h-0">
          {analysisResults.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center text-gray-500">
              <div>
                <p className="text-lg">分析データがありません</p>
                <p className="text-sm">マイクボタンを押して録音を開始すると、ここに分析結果が表示されます。</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedResults.map((group, groupIndex) => (
                <div key={groupIndex} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                  <div className="p-4 bg-gray-700/50">
                    <p
                      className="text-lg font-bold text-gray-200 mb-4"
                      title={group.bunsetsus.map(b => b.text).join('')}
                    >
                      {group.bunsetsus.map(b => b.text).join('')}
                    </p>
                    {/* 各指標のグリッド */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-4 text-sm">
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-400 flex items-center">
                            <FaTachometerAlt className="mr-2"/>話速
                          </span>
                          <span className="font-mono text-white">
                            {group.speech_rate.toFixed(2)} <span className="text-xs text-gray-500">字/秒</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-400 pl-6">Z値</span>
                          <span className={`font-mono font-bold ${getZScoreColor(group.speech_rate_zscore)}`}>
                            {group.speech_rate_zscore.toLocaleString('ja-JP', {signDisplay: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </span>
                        </div>
                        <div className="mt-1"><ZScoreBar value={group.speech_rate_zscore} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-400 flex items-center">
                            <FaVial className="mr-2"/>Jitter(周波数変動)
                          </span>
                          <span className="font-mono text-white">{group.jitter.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-400 pl-6">Z値</span>
                          <span className={`font-mono font-bold ${getZScoreColor(group.jitter_zscore)}`}>
                            {group.jitter_zscore.toLocaleString('ja-JP', {signDisplay: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </span>
                        </div>
                        <div className="mt-1"><ZScoreBar value={group.jitter_zscore} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-400 flex items-center">
                            <FaStream className="mr-2"/>Shimmer(振幅変動)
                          </span>
                          <span className="font-mono text-white">{group.shimmer.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-400 pl-6">Z値</span>
                          <span className={`font-mono font-bold ${getZScoreColor(group.shimmer_zscore)}`}>
                            {group.shimmer_zscore.toLocaleString('ja-JP', {signDisplay: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </span>
                        </div>
                        <div className="mt-1"><ZScoreBar value={group.shimmer_zscore} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-400 flex items-center">
                            <FaPauseCircle className="mr-2"/>ポーズ数
                          </span>
                          <span className="font-mono text-white">
                            {group.num_pauses} <span className="text-xs text-gray-500">回</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-400 pl-6">Z値</span>
                          <span className={`font-mono font-bold ${getZScoreColor(group.num_pauses_zscore)}`}>
                            {group.num_pauses_zscore.toLocaleString('ja-JP', {signDisplay: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </span>
                        </div>
                        <div className="mt-1"><ZScoreBar value={group.num_pauses_zscore} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-400 flex items-center">
                            <FaHourglassHalf className="mr-2"/>ポーズ長
                          </span>
                          <span className="font-mono text-white">
                            {group.avg_pause_duration.toFixed(3)} <span className="text-xs text-gray-500">秒</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-400 pl-6">Z値</span>
                          <span className={`font-mono font-bold ${getZScoreColor(group.avg_pause_duration_zscore)}`}>
                            {group.avg_pause_duration_zscore.toLocaleString('ja-JP', {signDisplay: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </span>
                        </div>
                        <div className="mt-1"><ZScoreBar value={group.avg_pause_duration_zscore} /></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {group.bunsetsus.map((result, bunsetsuIndex) => (
                        <div key={bunsetsuIndex} className="bg-gray-900/80 p-4 rounded-md border border-gray-700 flex flex-col">
                          <p className="text-lg font-semibold text-cyan-300 mb-4 truncate">{result.text}</p>
                          <div className="space-y-4 text-sm">
                            <div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-gray-400">音高</span>
                                <span className="font-mono text-white">
                                  {result.pitch.toFixed(1)} <span className="text-xs text-gray-500">Hz</span>
                                </span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-gray-400">Z値</span>
                                <span className={`font-mono font-bold ${getZScoreColor(result.pitch_zscore)}`}>
                                  {result.pitch_zscore.toLocaleString('ja-JP', {signDisplay: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </span>
                              </div>
                              <div className="mt-1"><ZScoreBar value={result.pitch_zscore} /></div>
                            </div>
                            <div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-gray-400">音量</span>
                                <span className="font-mono text-white">{result.volume.toFixed(1)}</span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-gray-400">Z値</span>
                                <span className={`font-mono font-bold ${getZScoreColor(result.volume_zscore)}`}>
                                  {result.volume_zscore.toLocaleString('ja-JP', {signDisplay: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </span>
                              </div>
                              <div className="mt-1"><ZScoreBar value={result.volume_zscore} /></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
