"use client"

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

type TwoChoicesProps = {
  option1: string;
  option2: string;
  onSelect: (option: string) => void;
  backgroundColor?: string;
  textColor?: string;
  position?: { x: number; y: number };
};

type ButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  color: 'blue' | 'green';
};

const Button: React.FC<ButtonProps> = ({ children, onClick, color }) => (
  <button
    className={`px-8 py-4 bg-${color}-500 text-white text-lg font-semibold rounded-full
                hover:bg-${color}-600 transition duration-300 ease-in-out transform
                hover:scale-105 focus:outline-none focus:ring-4 focus:ring-${color}-300
                focus:ring-opacity-50 shadow-md`}
    onClick={onClick}
  >
    {children}
  </button>
);

const TwoChoices: React.FC<TwoChoicesProps> = ({
  option1,
  option2,
  onSelect,
  backgroundColor = 'white',
  textColor = 'black',
  position = { x: 0, y: 0 },
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleSelect = (option: string) => {
    onSelect(option);
    setIsVisible(false);
  };

  const choicesContent = (
    <div 
      className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
      style={{ zIndex: 100 }}
    >
      <div 
        className="pointer-events-auto"
        style={{
          transform: `translate(${position.x * 100}%, ${position.y * 100}%)`,
        }}
      >
        <div
          className="bg-white rounded-2xl p-8 shadow-2xl"
          style={{ backgroundColor, color: textColor }}
        >
          <div className="flex justify-center space-x-4">
            <Button color="green" onClick={() => handleSelect(option2)}>
              {option2}
            </Button>
            <Button color="blue" onClick={() => handleSelect(option1)}>
              {option1}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && isVisible) {
    return createPortal(choicesContent, document.body);
  }

  return null;
};

export default TwoChoices;
