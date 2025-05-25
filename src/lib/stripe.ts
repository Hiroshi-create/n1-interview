// ./src/lib/stripe.ts
import { loadStripe, Stripe } from "@stripe/stripe-js";

// StripeのPromiseを一度だけ生成し、キャッシュするための変数
let stripePromiseSingleton: Promise<Stripe | null> | null = null;

/**
 * この関数は複数回呼び出されても、loadStripeの呼び出しは最初の一度だけ行われる
 * @returns {Promise<Stripe | null>} StripeインスタンスのPromise、またはキー未設定時はnullのPromise。
 */
export const getStripe = (): Promise<Stripe | null> => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.error(
      "Stripe Publishable Key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) is not set in environment variables."
    );
    // キーがない場合は、Stripeの機能が使えないため、nullを解決するPromiseを返す
    return Promise.resolve(null);
  }

  if (!stripePromiseSingleton) {
    stripePromiseSingleton = loadStripe(publishableKey);
  }

  return stripePromiseSingleton;
};

// もしデフォルトエクスポートにしたい場合
// export default getStripe;