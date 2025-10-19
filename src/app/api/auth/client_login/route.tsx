import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, enableTOTPMFA } from '../../../../lib/firebase-admin';
import { Auth, getAuth, TenantAwareAuth } from 'firebase-admin/auth';
import { logger } from '../../../../lib/logger';
import { handleApiError, validateAuthHeader, createSuccessResponse, ApiError } from '../../../../lib/api-utils';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 認証トークンの検証
    const idToken = validateAuthHeader(request);
    if (!idToken) {
      logger.warn('client_login: 認証トークンが不足');
      throw new ApiError(401, '認証トークンが不足しています。');
    }

    // トークンの検証
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    logger.debug('client_login: ユーザー認証開始', { userId });
    
    // tenantIdをdecodedTokenから直接取得
    const tenantId = decodedToken.firebase?.tenant || null;

    let auth: TenantAwareAuth | Auth = getAuth();
    if (tenantId) {
      auth = auth.tenantManager().authForTenant(tenantId);
    }

    const user = await auth.getUser(userId);
    logger.debug('client_login: ユーザー情報取得完了');

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const userData = userSnap.data();
      const mfaEnabled = user.multiFactor?.enrolledFactors && user.multiFactor.enrolledFactors.length > 0;
      const requireMFA = !mfaEnabled;

      if (userData?.inOrganization === true) {
        const organizationId = userData.organizationId;
        if (organizationId) {
          const duration = Date.now() - startTime;
          logger.api('POST', '/api/auth/client_login', 200, duration);
          logger.info('client_login: ログイン成功', { userId, organizationId });
          
          return createSuccessResponse({ 
            organizationId, 
            mfaEnabled, 
            requireMFA 
          });
        }
      }
      
      logger.warn('client_login: 組織に所属していないユーザー', { userId });
      throw new ApiError(403, '組織に所属していません。', { mfaEnabled, requireMFA });
      
    } else {
      logger.warn('client_login: ユーザーデータが見つかりません', { userId });
      throw new ApiError(404, 'ユーザーが見つかりません。');
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api('POST', '/api/auth/client_login', 500, duration);
    return handleApiError(error, 'client_login');
  }
}
