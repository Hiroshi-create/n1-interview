import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { User } from '@/stores/User'
import { Client } from '@/stores/Client';
import { v4 as uuidv4 } from 'uuid'

interface clientData {
  organizationType: string;
  organizationName: string;
  administratorId: string;
  childUsersCount: number;
  childUserIds: string[];
  employeeCount: number;
  country: string;
  language: string;
}

interface userData {
  email: string;
  userNickname: string;
  userName: string[];
  userId: string;
  gender: "other" | "male" | "female" | "not_specified";
  userBirthday: string;
  organizationPosition: string;
  userPhoneNumber: string | null;
}

interface RequestBody {
  client: clientData
  user: userData
}

export async function POST(request: NextRequest) {
  try {
    const { client: clientData, user: userData }: RequestBody = await request.json();

    const organizationId = uuidv4();
    const createdAt = FieldValue.serverTimestamp();

    // Clientデータの作成
    const newClientData: Client = {
      organizationId: organizationId,
      organizationType: clientData.organizationType,
      organizationName: clientData.organizationName,
      administratorId: clientData.administratorId,
      childUsersCount: 1,
      employeeCount: clientData.employeeCount,
      childUserIds: clientData.childUserIds,
      createdAt: createdAt,
      themesCount: 0,
      country: clientData.country,
      language: clientData.language,
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      subscriptionRenewalDate: createdAt,
      billingInfo: {
        companyName: clientData.organizationName,
        email: userData.email,
        address: '',
        paymentMethod: 'credit-card'
      },
      usageQuota: {
        users: 10,
        storage: 10
      },
      features: ['basic-features'],
      apiKey: uuidv4(),
      securitySettings: {
        twoFactorAuth: false,
        sessionTimeout: 3600,  // TODO
      },
      complianceStatus: {
        gdpr: false,
        hipaa: false,
        iso27001: false
      },
      lastAuditDate: {
        organization: createdAt,
        user: createdAt,
        security: createdAt,
      },
      securityScore: 85,  // TODO
    }

    // Userデータの作成
    const newUserData: User = {
      email: userData.email,
      userNickname: `${userData.userName[0]}${userData.userName[1]}`,
      userName: userData.userName,
      createdAt,
      userId: userData.userId,
      gender: userData.gender,
      userBirthday: Timestamp.fromDate(new Date(userData.userBirthday)) as any,
      interviewCount: 0,
      organizationId: organizationId,
      organizationPosition: userData.organizationPosition,
      userPhoneNumber: userData.userPhoneNumber,
      inOrganization: true,
      role: 'admin',
      permissions: ['admin-access'],
      lastLoginAt: createdAt,
      status: 'active',
      twoFactorAuthEnabled: false,
      notificationPreferences: {
        email: true,
        inApp: true
      },
      dataAccessLevel: 'full',
      featureAccess: ['all-features']
    }

    // Firestoreバッチ処理
    const batch = adminDb.batch()
    const clientRef = adminDb.collection('clients').doc(newClientData.organizationId)
    batch.set(clientRef, newClientData)
    const userRef = adminDb.collection('users').doc(newUserData.userId)
    batch.set(userRef, newUserData)

    await batch.commit()

    return NextResponse.json({
      success: true,
      clientId: newClientData.organizationId,
      userId: newUserData.userId
    })

  } catch (error) {
    console.error('Firestore保存エラー:', error)
    return NextResponse.json(
      { error: 'データの保存に失敗しました' },
      { status: 500 }
    )
  }
}
