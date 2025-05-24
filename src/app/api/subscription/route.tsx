import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Stripe } from "stripe"
import { adminDb } from "@/lib/firebase-admin";
import stripeServer from "@/lib/stripe-server";
import { User } from "@/stores/User";
import { Client } from "@/stores/Client";

interface RequestBody {
  userId: string;
  subscriptionProductId: string;
}

interface Plan {
  id: string;
  name: string;
  price: string | null;
  interval: Stripe.Price.Recurring.Interval | null;
  currency: string;
}

const getSelectedPlan = async (subscriptionProductId: string): Promise<Plan | null> => {
  const { data: plansList } = await stripeServer.plans.list();

  const selectedPlan = await Promise.all(
    plansList
      .filter(plan => plan.product === subscriptionProductId)
      .map(async (plan) => {
        const product = await stripeServer.products.retrieve(plan.product as string)
        return {
          id: plan.id,
          name: product.name,
          price: plan.amount_decimal,
          interval: plan.interval,
          currency: plan.currency,
        };
      })
  );

  return selectedPlan.length > 0 ? selectedPlan[0] : null;
}

export async function POST(req: NextRequest) {
  try {
    const headersList = headers();
    const host = headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const origin = `${protocol}://${host}`;

    const { userId, subscriptionProductId }: RequestBody = await req.json();

    if (!userId || !subscriptionProductId) {
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

    // プランの契約
    const plan = await getSelectedPlan(subscriptionProductId);

    if (!plan) {
      return NextResponse.json({ message: 'サブスクリプションのプランが見つかりません。' }, { status: 404 });
    }

    const session = await stripeServer.checkout.sessions.create({
      customer: stripe_customer,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.id,
          quantity: 1
        }
      ],
      success_url: `${origin}/client-view/${userId}/payment/success`,
      cancel_url: `${origin}/client-view/${userId}/payment/cancelled`,
    });

    return NextResponse.json({ id: session.id });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
