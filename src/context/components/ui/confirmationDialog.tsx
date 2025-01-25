"use client"

import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: (response: 'yes' | 'no') => void;
  title: string;
  message: string;
  yesText?: string;
  noText?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  yesText = 'はい',
  noText = 'いいえ'
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableElement = useRef<HTMLButtonElement>(null);
  const lastFocusableElement = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      firstFocusableElement.current?.focus();
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstFocusableElement.current) {
          event.preventDefault();
          lastFocusableElement.current?.focus();
        }
      } else {
        if (document.activeElement === lastFocusableElement.current) {
          event.preventDefault();
          firstFocusableElement.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const dialogContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={() => onClose('no')}
      ref={dialogRef}
      style={{zIndex: 100}}
    >
      <div 
        className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
        <p className="text-lg mb-6 text-gray-600">{message}</p>
        <div className="flex justify-between space-x-4">
          <button 
            ref={firstFocusableElement}
            onClick={() => onClose('no')} 
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-300"
          >
            {noText}
          </button>
          <button 
            ref={lastFocusableElement}
            onClick={() => onClose('yes')} 
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-300"
          >
            {yesText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};

export default ConfirmationDialog;
