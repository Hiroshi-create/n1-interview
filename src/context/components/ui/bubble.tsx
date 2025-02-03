"use client"

import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';

type BubbleProps = {
  children: string;
  backgroundColor?: string;
  textColor?: string;
  direction?: 'left' | 'right' | 'top' | 'bottom-r' | 'bottom-l';
  maxWidth?: string;
  maxHeight?: string;
  isCreatePortal?: boolean;
  portalPosition?: { x: number; y: number };
};

const Bubble: React.FC<BubbleProps> = ({
  children,
  backgroundColor = 'white',
  textColor = 'black',
  direction = 'left',
  maxWidth = '300px',
  maxHeight,
  isCreatePortal = false,
  portalPosition = { x: 0, y: 0 },
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [contentWidth, setContentWidth] = useState('auto');

  useEffect(() => {
    const checkOverflowAndResize = () => {
      if (contentRef.current) {
        const isContentOverflowing = contentRef.current.scrollWidth > contentRef.current.clientWidth ||
                                     (maxHeight && contentRef.current.scrollHeight > contentRef.current.clientHeight);
        if (typeof isContentOverflowing === 'boolean') {
          setIsOverflowing(isContentOverflowing);
        }

        if (isCreatePortal && isContentOverflowing) {
          setContentWidth(`${contentRef.current.scrollWidth}px`);
        } else {
          setContentWidth('auto');
        }
      }
    };

    checkOverflowAndResize();
    window.addEventListener('resize', checkOverflowAndResize);
    return () => {
      window.removeEventListener('resize', checkOverflowAndResize);
    };
  }, [children, maxWidth, maxHeight, isCreatePortal]);

  const getTriangleStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      content: '""',
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    switch (direction) {
      case 'left':
        return {
          ...baseStyle,
          left: '-10px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '10px 10px 10px 0',
          borderColor: `transparent ${backgroundColor} transparent transparent`,
        };
      case 'right':
        return {
          ...baseStyle,
          right: '-10px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '10px 0 10px 10px',
          borderColor: `transparent transparent transparent ${backgroundColor}`,
        };
      case 'top':
        return {
          ...baseStyle,
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '0 10px 10px 10px',
          borderColor: `transparent transparent ${backgroundColor} transparent`,
        };
      case 'bottom-r':
        return {
          ...baseStyle,
          bottom: '-12px',
          left: '75%',
          transform: 'translateX(-50%)',
          borderWidth: '15px 0px 0 40px',
          borderColor: `${backgroundColor} transparent transparent transparent`,
        };
      case 'bottom-l':
        return {
          ...baseStyle,
          bottom: '-12px',
          left: '25%',
          transform: 'translateX(-50%)',
          borderWidth: '15px 40px 0 0px',
          borderColor: `${backgroundColor} transparent transparent transparent`,
        };
    }
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor,
    color: textColor,
    zIndex: 1,
    maxWidth,
    maxHeight: maxHeight || 'none',
    width: contentWidth,
    overflowY: isOverflowing ? 'auto' : 'visible',
    overflowWrap: 'break-word',
    wordWrap: 'break-word',
    wordBreak: 'break-word',
    hyphens: 'auto',
    position: isCreatePortal ? 'relative' : 'static',
    right: isCreatePortal ? 0 : 'auto',
  };

  const bubbleContent = (
    <div 
      className={`${isCreatePortal ? 'fixed inset-0 z-[9999] pointer-events-none' : 'relative inline-block'}`}
      style={{zIndex: 100}}
    >
      <div 
        className={`${isCreatePortal ? 'absolute' : ''} pointer-events-auto`}
        style={isCreatePortal ? {
          top: `calc(50% + ${portalPosition.y * 50}%)`,
          left: `calc(50% + ${portalPosition.x * 50}%)`,
          transform: 'translateX(-100%)',
        } : {}}
      >
        <div
          className="relative rounded-lg p-4 m-2 shadow-md"
          style={contentStyle}
          ref={contentRef}
        >
          <ReactMarkdown>{children}</ReactMarkdown>
        </div>
        <div style={{ ...getTriangleStyle(), zIndex: 1 }} />
      </div>
    </div>
  );

  if (isCreatePortal && typeof document !== 'undefined') {
    return createPortal(bubbleContent, document.body);
  }

  return bubbleContent;
};

export default Bubble;
