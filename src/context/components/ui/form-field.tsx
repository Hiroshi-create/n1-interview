"use client"

import React from 'react';
import { cn } from '@/context/lib/utils';
import { Input } from './input';
import { Label } from './label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: any;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  disabled?: boolean;
  showSuccessIcon?: boolean;
  helpText?: string;
  className?: string;
  inputClassName?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  error,
  touched,
  required,
  placeholder,
  onChange,
  onBlur,
  disabled,
  showSuccessIcon = true,
  helpText,
  className,
  inputClassName
}) => {
  const hasError = touched && error;
  const hasSuccess = touched && !error && value && showSuccessIcon;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "pr-10 transition-all duration-200",
            hasError && "border-red-500 focus:ring-red-500",
            hasSuccess && "border-green-500 focus:ring-green-500",
            inputClassName
          )}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : helpText ? `${name}-help` : undefined}
        />
        
        {/* バリデーションアイコン */}
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
        
        {hasSuccess && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
        )}
      </div>
      
      {/* エラーメッセージ */}
      {hasError && (
        <p id={`${name}-error`} className="text-sm text-red-500 mt-1 animate-fadeIn">
          {error}
        </p>
      )}
      
      {/* ヘルプテキスト */}
      {helpText && !hasError && (
        <p id={`${name}-help`} className="text-sm text-gray-500 mt-1">
          {helpText}
        </p>
      )}
    </div>
  );
};

// パスワード強度インジケーター付きフィールド
interface PasswordFieldProps extends Omit<FormFieldProps, 'type'> {
  showStrength?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  showStrength = true,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  
  const getPasswordStrength = (password: string): {
    score: number;
    label: string;
    color: string;
  } => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score <= 2) return { score: 1, label: '弱い', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: '普通', color: 'bg-yellow-500' };
    if (score <= 5) return { score: 3, label: '強い', color: 'bg-blue-500' };
    return { score: 4, label: 'とても強い', color: 'bg-green-500' };
  };
  
  const strength = showStrength && props.value ? getPasswordStrength(props.value) : null;
  
  return (
    <div className="space-y-2">
      <FormField
        {...props}
        type={showPassword ? 'text' : 'password'}
        inputClassName="pr-20"
      />
      
      {/* パスワード表示切り替えボタン */}
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-10 top-9 text-sm text-gray-600 hover:text-gray-800"
      >
        {showPassword ? '隠す' : '表示'}
      </button>
      
      {/* パスワード強度表示 */}
      {showStrength && props.value && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-300",
                  strength && strength.score >= level
                    ? strength.color
                    : "bg-gray-200"
                )}
              />
            ))}
          </div>
          {strength && (
            <p className="text-xs text-gray-600">
              パスワード強度: <span className="font-medium">{strength.label}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// セレクトフィールド
interface SelectFieldProps {
  label: string;
  name: string;
  value: any;
  options: { value: string; label: string }[];
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  options,
  error,
  touched,
  required,
  onChange,
  onBlur,
  disabled,
  placeholder = "選択してください",
  helpText,
  className
}) => {
  const hasError = touched && error;
  
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 border rounded-md transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          hasError && "border-red-500 focus:ring-red-500",
          disabled && "bg-gray-100 cursor-not-allowed"
        )}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${name}-error` : helpText ? `${name}-help` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {hasError && (
        <p id={`${name}-error`} className="text-sm text-red-500 mt-1 animate-fadeIn">
          {error}
        </p>
      )}
      
      {helpText && !hasError && (
        <p id={`${name}-help`} className="text-sm text-gray-500 mt-1">
          {helpText}
        </p>
      )}
    </div>
  );
};