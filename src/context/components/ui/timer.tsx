import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';
import { FaPause } from 'react-icons/fa';

interface TimerProps {
  initialTime: number;
  isPaused: boolean;
  isStarted: boolean;
  onTogglePause: () => void;
  onTimerEnd: () => void;
  timeLeftWarning: number;
}

export interface TimerHandle {
  getRemainingTime: () => number;
}

const TimerWrapper = styled.div`
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 160px;
  height: 160px;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
  &:hover {
    transform: scale(1.05);
  }
  &:active {
    transform: scale(0.95);
  }
`;

const ContentWrapper = styled.div`
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
`;

const TimeDisplay = styled.div`
  user-select: none;
  font-size: 28px;
  font-weight: 700;
  color: #333333;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-family: 'Arial', sans-serif;
`;

const Label = styled.div`
  user-select: none;
  font-size: 9px;
  color: #333333;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 3px;
  font-family: 'Arial', sans-serif;
`;

const ProgressCircle = styled.svg`
  user-select: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
`;

const ProgressBackground = styled.circle<{ isPaused: boolean }>`
  user-select: none;
  fill: ${props => props.isPaused ? 'rgba(231, 76, 60, 0.1)' : 'transparent'};
  stroke: #34495E;
  stroke-width: 5;
  transition: fill 0.3s ease;
`;

const ProgressFill = styled.circle<{ progress: number; isPaused: boolean }>`
  user-select: none;
  fill: none;
  stroke: ${props => props.isPaused ? '#E74C3C' : '#2ECC71'};
  stroke-width: 5;
  stroke-dasharray: 439.6;
  stroke-dashoffset: ${props => 439.6 * (1 - props.progress / 100)};
  transition: stroke-dashoffset 0.5s ease-out, stroke 0.3s ease;
`;

const PauseIcon = styled.div`
  user-select: none;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: #E74C3C;
  z-index: 2;
`;

export interface TimerHandle {
  getRemainingTime: () => number;
}

const Timer = forwardRef<TimerHandle, TimerProps>(({
  initialTime,
  isPaused,
  isStarted,
  onTogglePause,
  onTimerEnd,
  timeLeftWarning,
}, ref) => {
  const [time, setTime] = useState(initialTime);
  const timeLeftWarningTriggeredRef = useRef(false);

  useImperativeHandle(ref, () => ({
    getRemainingTime: () => time
  }));

  useEffect(() => {
    setTime(initialTime);
    timeLeftWarningTriggeredRef.current = false;
  }, [initialTime]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isStarted && !isPaused && time > 0) {
      timer = setInterval(() => {
        setTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            onTimerEnd();
            return 0;
          }
          if (prevTime <= timeLeftWarning && !timeLeftWarningTriggeredRef.current) {
            // onTimeLeftWarning(true);
            timeLeftWarningTriggeredRef.current = true;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPaused, isStarted, onTimerEnd, timeLeftWarning]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = ((initialTime - time) / initialTime) * 100;

  return (
    <TimerWrapper onClick={onTogglePause}>
      <ProgressCircle>
        <ProgressBackground cx="80" cy="80" r="70" isPaused={isPaused} />
        <ProgressFill cx="80" cy="80" r="70" progress={progress} isPaused={isPaused} />
      </ProgressCircle>
      <ContentWrapper>
        <TimeDisplay>{formatTime(time)}</TimeDisplay>
        <Label>{isPaused ? '一時停止中' : '残り時間'}</Label>
      </ContentWrapper>
      {isPaused && (
        <PauseIcon>
          <FaPause />
        </PauseIcon>
      )}
    </TimerWrapper>
  );
});

Timer.displayName = 'Timer';

export default Timer;



















// import React, { useState, useEffect, useRef } from 'react';

// import styled from 'styled-components';
// import { FaPause } from 'react-icons/fa';

// interface TimerProps {
//   initialTime: number;
//   isPaused: boolean;
//   isStarted: boolean;
//   onTogglePause: () => void;
//   onTimerEnd: () => void;
//   timeLeftWarning: number;
//   onTimeLeftWarning: (isWarning: boolean) => void;
// }

// const TimerWrapper = styled.div`
//   user-select: none;
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   justify-content: center;
//   width: 160px;
//   height: 160px;
//   position: relative;
//   cursor: pointer;
//   transition: transform 0.2s ease;
//   &:hover {
//     transform: scale(1.05);
//   }
//   &:active {
//     transform: scale(0.95);
//   }
// `;

// const ContentWrapper = styled.div`
//   user-select: none;
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   justify-content: center;
//   position: absolute;
//   top: 0;
//   left: 0;
//   right: 0;
//   bottom: 0;
//   z-index: 1;
// `;

// const TimeDisplay = styled.div`
//   user-select: none;
//   font-size: 28px;
//   font-weight: 700;
//   color: #333333;
//   text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
//   font-family: 'Arial', sans-serif;
// `;

// const Label = styled.div`
//   user-select: none;
//   font-size: 9px;
//   color: #333333;
//   text-transform: uppercase;
//   letter-spacing: 2px;
//   margin-top: 3px;
//   font-family: 'Arial', sans-serif;
// `;

// const ProgressCircle = styled.svg`
//   user-select: none;
//   position: absolute;
//   top: 0;
//   left: 0;
//   width: 100%;
//   height: 100%;
//   transform: rotate(-90deg);
// `;

// const ProgressBackground = styled.circle<{ isPaused: boolean }>`
//   user-select: none;
//   fill: ${props => props.isPaused ? 'rgba(231, 76, 60, 0.1)' : 'transparent'};
//   stroke: #34495E;
//   stroke-width: 5;
//   transition: fill 0.3s ease;
// `;

// const ProgressFill = styled.circle<{ progress: number; isPaused: boolean }>`
//   user-select: none;
//   fill: none;
//   stroke: ${props => props.isPaused ? '#E74C3C' : '#2ECC71'};
//   stroke-width: 5;
//   stroke-dasharray: 439.6;
//   stroke-dashoffset: ${props => 439.6 * (1 - props.progress / 100)};
//   transition: stroke-dashoffset 0.5s ease-out, stroke 0.3s ease;
// `;

// const PauseIcon = styled.div`
//   user-select: none;
//   position: absolute;
//   top: 50%;
//   left: 50%;
//   transform: translate(-50%, -50%);
//   font-size: 24px;
//   color: #E74C3C;
//   z-index: 2;
// `;

// const Timer: React.FC<TimerProps> = ({
//   initialTime,
//   isPaused,
//   isStarted,
//   onTogglePause,
//   onTimerEnd,
//   timeLeftWarning,
//   onTimeLeftWarning,
// }) => {
//   const [time, setTime] = useState(initialTime);
//   const timeLeftWarningTriggeredRef = useRef(false);

//   useEffect(() => {
//     setTime(initialTime);
//     timeLeftWarningTriggeredRef.current = false;
//   }, [initialTime]);

//   useEffect(() => {
//     let timer: NodeJS.Timeout;
//     if (isStarted && !isPaused && time > 0) {
//       timer = setInterval(() => {
//         setTime((prevTime) => {
//           if (prevTime <= 1) {
//             clearInterval(timer);
//             onTimerEnd();
//             return 0;
//           }
//           if (prevTime <= timeLeftWarning && !timeLeftWarningTriggeredRef.current) {
//             onTimeLeftWarning(true);
//             timeLeftWarningTriggeredRef.current = true;
//           }
//           return prevTime - 1;
//         });
//       }, 1000);
//     }
//     return () => clearInterval(timer);
//   }, [isPaused, isStarted, onTimerEnd, onTimeLeftWarning, timeLeftWarning]);

//   const formatTime = (seconds: number): string => {
//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = seconds % 60;
//     return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
//   };

//   const progress = ((initialTime - time) / initialTime) * 100;

//   return (
//     <TimerWrapper onClick={onTogglePause}>
//       <ProgressCircle>
//         <ProgressBackground cx="80" cy="80" r="70" isPaused={isPaused} />
//         <ProgressFill cx="80" cy="80" r="70" progress={progress} isPaused={isPaused} />
//       </ProgressCircle>
//       <ContentWrapper>
//         <TimeDisplay>{formatTime(time)}</TimeDisplay>
//         <Label>{isPaused ? '一時停止中' : '残り時間'}</Label>
//       </ContentWrapper>
//       {isPaused && (
//         <PauseIcon>
//           <FaPause />
//         </PauseIcon>
//       )}
//     </TimerWrapper>
//   );
// };

// export default Timer;
