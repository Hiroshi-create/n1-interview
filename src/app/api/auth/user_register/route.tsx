import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { User } from '@/stores/User';
import { logger } from '../../../../lib/logger';
import { handleApiError, parseRequestBody, ApiError, createSuccessResponse } from '../../../../lib/api-utils';
import { z } from 'zod';

// Zodスキーマで入力検証
const UserRegisterSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  userNickname: z.string().min(1, 'ニックネームは必須です').max(50, 'ニックネームは50文字以内で入力してください'),
  gender: z.enum(['male', 'female', 'other', 'not_specified']),
  userBirthday: z.object({
    year: z.string().regex(/^\d{4}$/, '年は4桁の数字で入力してください'),
    monthDay: z.string().regex(/^\d{4}$/, '月日は4桁の数字で入力してください')
  }),
  userId: z.string().min(1, 'ユーザーIDは必須です')
});

type RequestBody = z.infer<typeof UserRegisterSchema>;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // リクエストボディの解析と検証
    const body = await parseRequestBody<RequestBody>(req);
    const validatedData = UserRegisterSchema.parse(body);
    const { email, userNickname, gender, userBirthday, userId } = validatedData;
    
    logger.debug('user_register: ユーザー登録開始', { email, userId });

    // 生年月日の処理
    const year = userBirthday.year;
    const month = userBirthday.monthDay.substring(0, 2);
    const day = userBirthday.monthDay.substring(2);
    const birthdayString = `${year}-${month}-${day}`;
    const birthdayDate = new Date(birthdayString);
    
    if (isNaN(birthdayDate.getTime())) {
      logger.error('user_register: 無効な生年月日', undefined, { birthdayString });
      throw new ApiError(400, '無効な生年月日です');
    }

    const birthdayTimestamp = Timestamp.fromDate(birthdayDate);

    const userData: User = {
      email: email,
      userNickname: userNickname,
      userName: [],
      createdAt: FieldValue.serverTimestamp(),
      userId: userId,
      gender: gender,
      userBirthday: birthdayTimestamp,
      interviewCount: 0,
      organizationId: '',
      organizationPosition: '',
      userPhoneNumber: null,
      inOrganization: false,
      role: 'user',
      permissions: [],
      lastLoginAt: FieldValue.serverTimestamp(),
      status: 'active',
      twoFactorAuthEnabled: false,
      notificationPreferences: {
        email: true,
        inApp: true,
      },
      dataAccessLevel: 'basic',
      featureAccess: [],
    };

    // 既存ユーザーのチェック
    const existingUser = await adminDb.doc(`users/${userId}`).get();
    if (existingUser.exists) {
      logger.warn('user_register: ユーザーが既に存在', { userId });
      throw new ApiError(409, 'このユーザーは既に登録されています');
    }

    // データベースへの保存
    await adminDb.doc(`users/${userId}`).set(userData);
    
    const duration = Date.now() - startTime;
    logger.api('POST', '/api/auth/user_register', 201, duration);
    logger.info('user_register: ユーザー登録成功', { email, userId });

    return NextResponse.json({
      message: 'ユーザーが正常に登録されました',
      user: {
        email: email,
        userNickname: userNickname,
        userId: userId,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logger.api('POST', '/api/auth/user_register', 500, duration);
    return handleApiError(error, 'user_register');
  }
}
