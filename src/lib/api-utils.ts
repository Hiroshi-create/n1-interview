/**
 * API ルート用のユーティリティ関数
 * 統一されたエラーハンドリングとレスポンス形式を提供
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';
import { 
  ApplicationError, 
  withRetry, 
  withTimeout, 
  CircuitBreaker,
  ExternalServiceError 
} from './error-handler';

/**
 * カスタム API エラークラス
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 統一エラーハンドラー
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  const contextInfo = context ? ` in ${context}` : '';
  
  // Zod バリデーションエラー
  if (error instanceof ZodError) {
    logger.warn(`Validation error${contextInfo}`, { errors: error.issues });
    return NextResponse.json(
      { 
        error: 'Invalid input data',
        details: error.issues,
        code: 'VALIDATION_ERROR'
      },
      { status: 400 }
    );
  }
  
  // 新しい ApplicationError の処理
  if (error instanceof ApplicationError) {
    logger.error(`Application Error${contextInfo}: ${error.message}`, error, { 
      statusCode: error.statusCode,
      code: error.code,
      details: error.details 
    });
    
    return NextResponse.json(
      { 
        error: error.message,
        details: error.isOperational ? error.details : undefined,
        code: error.code
      },
      { status: error.statusCode }
    );
  }
  
  // 旧 ApiError の処理（後方互換性）
  if (error instanceof ApiError) {
    logger.error(`API Error${contextInfo}: ${error.message}`, error, { 
      statusCode: error.statusCode,
      details: error.details 
    });
    
    return NextResponse.json(
      { 
        error: error.message,
        details: error.details,
        code: 'API_ERROR'
      },
      { status: error.statusCode }
    );
  }
  
  // Firebase Auth エラー
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message: string };
    
    if (firebaseError.code?.startsWith('auth/')) {
      logger.warn(`Firebase Auth error${contextInfo}`, { code: firebaseError.code });
      
      // よくあるFirebase認証エラーのマッピング
      const authErrorMap: Record<string, { status: number; message: string }> = {
        'auth/invalid-id-token': { status: 401, message: 'Invalid authentication token' },
        'auth/id-token-expired': { status: 401, message: 'Authentication token expired' },
        'auth/user-not-found': { status: 404, message: 'User not found' },
        'auth/insufficient-permission': { status: 403, message: 'Insufficient permissions' },
      };
      
      const mappedError = authErrorMap[firebaseError.code] || { 
        status: 401, 
        message: 'Authentication failed' 
      };
      
      return NextResponse.json(
        { 
          error: mappedError.message,
          code: 'AUTH_ERROR'
        },
        { status: mappedError.status }
      );
    }
  }
  
  // その他の予期しないエラー
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  logger.error(`Unexpected error${contextInfo}`, error as Error);
  
  return NextResponse.json(
    { 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  );
}

/**
 * 認証ヘッダーの検証
 */
export function validateAuthHeader(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split('Bearer ')[1];
}

/**
 * API レスポンスの統一形式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  code?: string;
}

/**
 * 成功レスポンスのヘルパー
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({
    success: true,
    data
  } as ApiResponse<T>, { status });
}

/**
 * エラーレスポンスのヘルパー
 */
export function createErrorResponse(
  error: string, 
  status: number = 500, 
  details?: any,
  code?: string
): NextResponse {
  return NextResponse.json({
    success: false,
    error,
    details,
    code
  } as ApiResponse, { status });
}

/**
 * API ルートラッパー - 統一エラーハンドリング
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>,
  routeName: string
) {
  return async (...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;
      
      // レスポンスステータスを取得（result.status はアクセスできないため推定）
      logger.api('API', routeName, 200, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResponse = handleApiError(error, routeName);
      
      // ステータスコードを推定（実際のレスポンスから）
      logger.api('API', routeName, 500, duration);
      
      return errorResponse;
    }
  };
}

/**
 * リクエストボディの安全な解析
 */
export async function parseRequestBody<T>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new ApiError(400, 'Invalid JSON in request body');
  }
}

/**
 * 環境変数の安全な取得
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}