import { NextRequest, NextResponse } from "next/server";
import initStripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    const stripe = new initStripe(process.env.STRIPE_SECRET_KEY!);
    const endpointSecret = process.env.STRIPE_SIGNING_SECRET;
    const signature = req.headers.get('stripe-signature');

    const reqBuffer = Buffer.from(await req.arrayBuffer());

    let event;

    try {
        event = stripe.webhooks.constructEvent(reqBuffer, signature!, endpointSecret!);

        switch (event.type) {
            case 'customer.subscription.created':
                const customerSubscriptionCreated = event.data.object;
                await updateClientSubscription(
                    event.data.object.customer as string,
                    'active',
                    customerSubscriptionCreated.items.data[0].plan.interval,
                    customerSubscriptionCreated.items.data[0].plan.product as string,
                );
                break;
            case 'customer.subscription.deleted':
                await updateClientSubscription(
                    event.data.object.customer as string,
                    'inactive',
                    null,
                    null,
                );
                break;
            case 'customer.subscription.updated':
                const customerSubscriptionUpdated = event.data.object;

                if (customerSubscriptionUpdated.status === "canceled") {
                    await updateClientSubscription(
                        event.data.object.customer as string,
                        'inactive',
                        null,
                        null,
                    );
                } else {
                    await updateClientSubscription(
                        event.data.object.customer as string,
                        'active',
                        customerSubscriptionUpdated.items.data[0].plan.interval,
                        customerSubscriptionUpdated.items.data[0].plan.product as string,
                    );
                }
                break;
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        return NextResponse.json(`Webhook Error: ${err.message}`, { status: 401 });
    }
}

async function updateClientSubscription(
    stripeCustomerId: string,
    subscriptionStatus: 'active' | 'inactive',
    subscriptionInterval: string | null,
    subscriptionProductId: string | null,
) {
    const clientsRef = adminDb.collection('clients');
    const query = clientsRef.where('stripeCustomerId', '==', stripeCustomerId);
    const snapshot = await query.get();

    if (snapshot.empty) {
        console.log('No matching documents.');
        return;
    }

    snapshot.forEach(doc => {
        doc.ref.update({
            subscriptionStatus: subscriptionStatus,
            subscriptionInterval: subscriptionInterval,
            subscriptionProductId: subscriptionProductId,
        });
    });
}




















// import { NextRequest, NextResponse } from "next/server";
// import { adminDb } from "@/lib/firebase-admin";
// import initStripe, { Stripe } from "stripe";

// const getOrgDoc = async (customer: string) => {
//     const orgRef = adminDb.collection('clients').where('stripeCustomerId', '==', customer).limit(1);
//     const orgSnapshot = await orgRef.get();
//     if (orgSnapshot.empty) {
//         throw new Error('対応する組織が見つかりません');
//     }
//     return orgSnapshot.docs[0].ref;
// }

// export async function POST(req:NextRequest) {
//     const stripe = new initStripe(process.env.STRIPE_SECRET_KEY!);
//     const endpointSecret = process.env.STRIPE_SIGNING_SECRET;
//     const signature = req.headers.get('stripe-signature');
//     const reqBuffer = Buffer.from(await req.arrayBuffer());

//     let event;

//     // 組織情報の更新
//     const batch = adminDb.batch();

//     try {
//         event = stripe.webhooks.constructEvent(reqBuffer, signature!, endpointSecret!);
//         let orgDoc;

//         switch (event.type) {
//             case 'customer.subscription.created':
//                 const customerSubscriptionCreated = event.data.object;
//                 orgDoc = await getOrgDoc(event.data.object.customer as string);

//                 console.log("orgDoc");
//                 console.log(orgDoc);

//                 batch.update(orgDoc, {
//                     'subscriptionStatus': "active",
//                     'subscriptionInterval': customerSubscriptionCreated.items.data[0].plan.interval,
//                     'subscriptionProductId': customerSubscriptionCreated.items.data[0].plan.product as string,
//                 });
//                 break;
//             case 'customer.subscription.deleted':
//                 orgDoc = await getOrgDoc(event.data.object.customer as string);

//                 batch.update(orgDoc, {
//                     'subscriptionStatus': "inactive",
//                     'subscriptionInterval': null,
//                     'subscriptionProductId': null,
//                 });
//                 break;
//             case 'customer.subscription.updated':
//                 const customerSubscriptionUpdated = event.data.object;
//                 orgDoc = await getOrgDoc(event.data.object.customer as string);

//                 if (customerSubscriptionUpdated.status === "canceled") {
//                     batch.update(orgDoc, {
//                         'subscriptionStatus': "inactive",
//                         'subscriptionInterval': null,
//                         'subscriptionProductId': null,
//                     });
//                     break;
//                 } else {
//                     batch.update(orgDoc, {
//                         'subscriptionStatus': "active",
//                         'subscriptionInterval': customerSubscriptionUpdated.items.data[0].plan.interval,
//                         'subscriptionProductId': customerSubscriptionUpdated.items.data[0].plan.product as string,
//                     });
//                     break;
//                 }
//         }

//         // バッチ処理を実行
//         await batch.commit();

//         return NextResponse.json({ received: true });
//     } catch (err: any) {
//         console.error(err.message);
//         return NextResponse.json(`Webhook Error: ${err.message}`, { status: 401 });
//     }
// }
