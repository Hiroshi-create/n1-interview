import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore'

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
}

let adminApp;
if (getApps().length === 0) {
  console.log('サーバーサイド Firebase 初期化');
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  console.log('サーバーサイド Firebase 初期化済');
  adminApp = getApps()[0];
}

export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)

export const enableTOTPMFA = async () => {
  try {
    const result =  await adminAuth.projectConfigManager().updateProjectConfig({
      multiFactorConfig: {
        state: "ENABLED",
        providerConfigs: [{
          state: "ENABLED",
          totpProviderConfig: {
            adjacentIntervals: 5 // デフォルト値
          }
        }]
      }
    });
    console.log('プロジェクトレベルで TOTP MFA を有効化しました。', result);
    return result;
  } catch (error) {
    console.error('プロジェクトレベルで TOTP MFA の有効化に失敗しました:', error);
    throw error;
  }
};