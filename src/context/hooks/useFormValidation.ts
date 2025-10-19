import { useState, useCallback, useEffect } from 'react';

export interface ValidationRule {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: any) => boolean | string;
  custom?: (value: any, formValues?: any) => boolean | string;
}

export interface FieldValidation {
  value: any;
  error: string | null;
  touched: boolean;
  validating: boolean;
}

interface UseFormValidationOptions {
  mode?: 'onBlur' | 'onChange' | 'onSubmit';
  reValidateMode?: 'onBlur' | 'onChange';
  debounceTime?: number;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, ValidationRule>>,
  options: UseFormValidationOptions = {}
) {
  const {
    mode = 'onChange',
    reValidateMode = 'onChange',
    debounceTime = 300
  } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [debounceTimers, setDebounceTimers] = useState<Record<string, NodeJS.Timeout>>({});

  // バリデーション実行
  const validateField = useCallback((
    fieldName: keyof T,
    value: any,
    allValues: T
  ): string | null => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    // 必須チェック
    if (rules.required) {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return typeof rules.required === 'string' 
          ? rules.required 
          : `${String(fieldName)}は必須です`;
      }
    }

    // 最小長チェック
    if (rules.minLength && value) {
      const length = typeof value === 'string' ? value.length : value.toString().length;
      if (length < rules.minLength.value) {
        return rules.minLength.message;
      }
    }

    // 最大長チェック
    if (rules.maxLength && value) {
      const length = typeof value === 'string' ? value.length : value.toString().length;
      if (length > rules.maxLength.value) {
        return rules.maxLength.message;
      }
    }

    // パターンチェック
    if (rules.pattern && value) {
      if (!rules.pattern.value.test(value)) {
        return rules.pattern.message;
      }
    }

    // カスタムバリデーション
    if (rules.validate) {
      const result = rules.validate(value);
      if (result !== true) {
        return typeof result === 'string' ? result : 'バリデーションエラー';
      }
    }

    // フォーム全体を考慮したカスタムバリデーション
    if (rules.custom) {
      const result = rules.custom(value, allValues);
      if (result !== true) {
        return typeof result === 'string' ? result : 'バリデーションエラー';
      }
    }

    return null;
  }, [validationRules]);

  // 全フィールドのバリデーション
  const validateAllFields = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let hasError = false;

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(
        fieldName as keyof T,
        values[fieldName as keyof T],
        values
      );
      if (error) {
        newErrors[fieldName as keyof T] = error;
        hasError = true;
      }
    });

    setErrors(newErrors);
    setIsValid(!hasError);
    return !hasError;
  }, [values, validateField, validationRules]);

  // デバウンス付きバリデーション
  const validateFieldWithDebounce = useCallback((
    fieldName: keyof T,
    value: any
  ) => {
    // 既存のタイマーをクリア
    if (debounceTimers[fieldName as string]) {
      clearTimeout(debounceTimers[fieldName as string]);
    }

    // 新しいタイマーを設定
    const timer = setTimeout(() => {
      const error = validateField(fieldName, value, values);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error || undefined
      }));
    }, debounceTime);

    setDebounceTimers(prev => ({
      ...prev,
      [fieldName as string]: timer
    }));
  }, [validateField, values, debounceTime, debounceTimers]);

  // 値の変更ハンドラ
  const handleChange = useCallback((fieldName: keyof T) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;

    setValues(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // タッチ済みに設定
    if (!touched[fieldName]) {
      setTouched(prev => ({
        ...prev,
        [fieldName]: true
      }));
    }

    // バリデーションモードに応じて実行
    if (mode === 'onChange' || (touched[fieldName] && reValidateMode === 'onChange')) {
      validateFieldWithDebounce(fieldName, value);
    }
  }, [mode, reValidateMode, touched, validateFieldWithDebounce]);

  // ブラーハンドラ
  const handleBlur = useCallback((fieldName: keyof T) => () => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    if (mode === 'onBlur' || reValidateMode === 'onBlur') {
      const error = validateField(fieldName, values[fieldName], values);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error || undefined
      }));
    }
  }, [mode, reValidateMode, values, validateField]);

  // フォーム送信ハンドラ
  const handleSubmit = useCallback((
    onSubmit: (values: T) => void | Promise<void>
  ) => async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 全フィールドをタッチ済みに
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    Object.keys(values).forEach(key => {
      allTouched[key as keyof T] = true;
    });
    setTouched(allTouched);

    // バリデーション実行
    setIsValidating(true);
    const isFormValid = validateAllFields();
    setIsValidating(false);

    if (isFormValid) {
      await onSubmit(values);
    }
  }, [values, validateAllFields]);

  // フィールドのリセット
  const reset = useCallback((newValues?: Partial<T>) => {
    setValues(newValues ? { ...initialValues, ...newValues } : initialValues);
    setErrors({});
    setTouched({});
    setIsValid(true);
  }, [initialValues]);

  // 特定フィールドのエラークリア
  const clearFieldError = useCallback((fieldName: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      Object.values(debounceTimers).forEach(timer => clearTimeout(timer));
    };
  }, [debounceTimers]);

  return {
    values,
    errors,
    touched,
    isValid,
    isValidating,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    clearFieldError,
    setValues,
    validateField,
    validateAllFields
  };
}