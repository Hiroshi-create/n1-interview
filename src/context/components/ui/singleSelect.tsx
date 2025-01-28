"use client"

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

type SingleSelectProps = {
  options: string[];
  buttonColors?: string[];
  onSelect: (option: string) => void;
  backgroundColor?: string;
  textColor?: string;
  position?: { x: number; y: number };
};

type ButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  color?: string;
};

const Button: React.FC<ButtonProps> = ({ children, onClick, className, color = 'blue' }) => {
  const hoverColor = (c: string) => {
    const darken = (hex: string, amount: number) => {
      return '#' + hex.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) - amount)).toString(16)).substr(-2));
    };
    return darken(color, 20);
  };

  return (
    <button
      className={`text-white text-lg font-semibold rounded-full
                  transition duration-300 ease-in-out transform
                  hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50 shadow-lg ${className}`}
      style={{
        backgroundColor: color,
        width: '160px',
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '20px',
        padding: '10px',
        fontSize: '1.5rem',
        lineHeight: '1.2',
        textAlign: 'center',
      }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverColor(color))}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = color)}
    >
      {children}
    </button>
  );
};

const SingleSelect: React.FC<SingleSelectProps> = ({
    options,
    buttonColors,
    onSelect,
    backgroundColor = 'white',
    textColor = 'black',
    position = { x: 0, y: 0 },
}) => {
    const [isVisible, setIsVisible] = useState(true);
  
    const defaultColors = ['#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#3B82F6'];
  
    const colors = useMemo(() => {
      if (buttonColors && buttonColors.length > 0) {
        return buttonColors;
      }
      return Array(options.length).fill(0).map((_, index) => defaultColors[index % defaultColors.length]);
    }, [options.length, buttonColors]);
  
    const handleSelect = (option: string) => {
      onSelect(option);
      setIsVisible(false);
    };
  
    const selectContent = (
      <div 
        className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
        style={{ zIndex: 100 }}
      >
        <div 
          className="pointer-events-auto transform"
          style={{
            transform: `translate(${position.x * 100}%, ${position.y * 100}%)`,
            maxWidth: '80vw',
            overflowX: 'auto'
          }}
        >
          <div
            className="rounded-3xl shadow-2xl"
            style={{ 
              backgroundColor, 
              color: textColor, 
              borderRadius: '2rem',
              padding: '1rem',
            }}
          >
            <div 
              className="flex flex-nowrap justify-center" 
              style={{ 
                gap: '1rem',
                width: `${options.length * 160}px`,
                maxWidth: '80vw',
                margin: '0 auto'
              }}
            >
              {options.slice().reverse().map((option, index) => (
                <Button 
                  key={index} 
                  onClick={() => handleSelect(option)}
                  className="flex-shrink-0"
                  color={colors[(options.length - 1 - index) % colors.length]}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  
    if (typeof document !== 'undefined' && isVisible) {
      return createPortal(selectContent, document.body);
    }
  
    return null;
};

export default SingleSelect;