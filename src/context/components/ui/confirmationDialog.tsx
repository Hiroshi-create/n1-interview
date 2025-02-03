"use client"

import React, { useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: (response: 'yes' | 'no') => void;
  title: string;
  message: ReactNode; // stringからReactNodeに変更
  yesText?: string;
  noText?: string;
  isLoading?: boolean;
  singleButton?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  yesText = 'はい',
  noText = 'いいえ',
  isLoading = false,
  singleButton = false
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
        <div className="text-lg mb-6 text-gray-600"> {/* pタグからdivに変更 */}
          {message}
        </div>
        <div className={`flex justify-between ${singleButton ? '' : 'space-x-4'}`}>
          {!singleButton && (
            <button 
              ref={firstFocusableElement}
              onClick={() => onClose('no')} 
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-300"
              disabled={isLoading}
            >
              {noText}
            </button>
          )}
          <button 
            ref={singleButton ? firstFocusableElement : lastFocusableElement}
            onClick={() => onClose('yes')} 
            className={`flex-1 px-4 py-2 ${isLoading ? 'bg-green-300' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition-colors duration-300 flex items-center justify-center`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                処理中...
              </>
            ) : yesText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};

export default ConfirmationDialog;
