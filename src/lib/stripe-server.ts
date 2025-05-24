// import initStripe from "stripe";

// if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
//   console.log(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
//   throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
// }
// const stripe = new initStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);


import initStripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripeServer = new initStripe(process.env.STRIPE_SECRET_KEY!);

export default stripeServer;