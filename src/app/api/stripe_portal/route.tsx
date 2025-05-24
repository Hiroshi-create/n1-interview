import { adminDb } from "@/lib/firebase-admin";
import { Client } from "@/stores/Client";
import { User } from "@/stores/User";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import initStripe from "stripe";

interface RequestBody {
    userId: string;
}

export async function POST(req: NextRequest) {
    try {
        const headersList = headers();
        const host = headersList.get('host');
        const protocol = headersList.get('x-forwarded-proto') || 'http';
        const origin = `${protocol}://${host}`;
    
        const { userId }: RequestBody = await req.json();
    
        if (!userId) {
            return NextResponse.json({ error: 'ユーザー情報が提供されていません' }, { status: 400 });
        }
    
        // ユーザー情報取得
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return NextResponse.json({ message: 'ユーザーが見つかりません。' }, { status: 404 });
        }
        const userData = userSnap.data() as User;
    
        // 組織情報取得
        if (!userData.inOrganization || userData.organizationId === "") {
            return NextResponse.json({ message: '組織に属していません。' }, { status: 404 });
        }
        const clientRef = adminDb.collection('clients').doc(userData.organizationId);
        const clientSnap = await clientRef.get();
        if (!clientSnap.exists) {
            return NextResponse.json({ message: '組織が見つかりません。' }, { status: 404 });
        }
        const clientData = clientSnap.data() as Client;
    
        // stripeCustomerIdの取得
        const stripe_customer = clientData.stripeCustomerId;
        if (!stripe_customer) {
            return NextResponse.json({ message: 'Stripe顧客IDが見つかりません。' }, { status: 404 });
        }
        
        const stripe = new initStripe(process.env.STRIPE_SECRET_KEY!);

        const session = await stripe.billingPortal.sessions.create({
            customer: stripe_customer,
            return_url: `${origin}/client-view/${userId}/dashboard`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}