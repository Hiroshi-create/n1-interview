"use client"

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
}

// 縦型のダイバージング・バーコンポーネント
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
    <div style={{ textAlign: 'center', width: '70px' }}>
      <strong style={{ color: '#555', fontSize: '0.8rem' }}>{label}</strong>
      <div style={{
        position: 'relative',
        height: '80px',
        width: '10px',
        background: '#e9ecef',
        borderRadius: '99px',
        margin: '0.4rem auto',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: '#adb5bd',
          transform: 'translateY(-1px)',
        }} />
        <div style={barStyle} />
      </div>
      <span style={{ fontSize: '0.8rem', color: '#333' }}>{value}</span>
      <div style={{ fontSize: '0.7rem', color: barColor, fontWeight: 'bold' }}>
        Z:{zScore.toFixed(2)}
      </div>
    </div>
  );
};

const SpeechRecognition = (): JSX.Element => {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [analysisResults, setAnalysisResults] = useState<BunsetsuData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  const cleanup = () => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleMicClick = async () => {
    if (isListening) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "stop" }));
      }
      cleanup();
      setIsListening(false);
    } else {
      setAnalysisResults([]);
      setInterimTranscript("");
      try {
        wsRef.current = new WebSocket(WEBSOCKET_URL);
        wsRef.current.onopen = () => setIsListening(true);
        wsRef.current.onclose = () => { cleanup(); setIsListening(false); };
        wsRef.current.onerror = () => { cleanup(); setIsListening(false); };

        // ▼▼▼【修正箇所】▼▼▼
        wsRef.current.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'final_analysis') {
            // サーバーから送られてくる全データで状態を上書きする
            setAnalysisResults(message.data);
            setInterimTranscript("");
          } else if (message.type === 'interim_transcript') {
            setInterimTranscript(message.transcript);
          }
        };
        // ▲▲▲【修正箇所】▲▲▲

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const context = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(BUFFER_SIZE, 1, 1);
        scriptProcessorRef.current = processor;
        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Array[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
          }
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(int16Array.buffer);
          }
        };
        source.connect(processor);
        processor.connect(context.destination);
      } catch (error) {
        alert("マイクへのアクセスに失敗しました。");
      }
    }
  };
  
  useEffect(() => {
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'end' });
  }, [analysisResults]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      cleanup();
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 70px)',
      fontFamily: 'sans-serif',
      background: '#f4f4f9'
    }}>
      
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        padding: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          {analysisResults.map((result, index) => (
            <div key={index} style={{
              background: 'white',
              padding: '1rem',
              borderRadius: '12px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              width: '180px',
              flexShrink: 0,
            }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: '#333', textAlign: 'center' }}>{result.text}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <VerticalAnalysisBar
                  label="Pitch"
                  value={`${result.pitch.toFixed(0)} Hz`}
                  zScore={result.pitch_zscore}
                />
                <VerticalAnalysisBar
                  label="Volume"
                  value={result.volume.toFixed(0)}
                  zScore={result.volume_zscore}
                />
              </div>
            </div>
          ))}
          <div ref={resultsEndRef} />
        </div>
      </main>
      
      {interimTranscript && (
          <div style={{ padding: '0 1rem 1rem 1rem', color: '#888', fontStyle: 'italic', flexShrink: 0, textAlign: 'center' }}>
            認識中: {interimTranscript}
          </div>
      )}

      <footer style={{
        padding: '1rem',
        borderTop: '1px solid #ddd',
        background: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <button 
          onClick={handleMicClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            color: 'white',
            background: isListening ? '#d9534f' : '#5cb85c',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
          {isListening ? "停止" : "録音開始"}
        </button>
      </footer>
    </div>
  );
};

export default SpeechRecognition;
