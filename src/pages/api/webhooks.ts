import { NextApiRequest, NextApiResponse } from "next";
import { Readable } from "stream";
import Stripe from "stripe";
import { stripe } from "../../services/stripe";
import { saveSubscription } from "./_lib/manageSubscription";
import Cors from "micro-cors";

async function buffer(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
export const config = {
  api: {
    bodyParser: false,
  },
};

const cors = Cors({
  allowMethods: ["POST", "HEAD"],
});

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // console.log("evento recebido");
  if (req.method === "POST") {
    const buf = await buffer(req);
    const secret = req.headers["stripe-signature"];

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        buf,
        secret,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log("EVENTO:", event);
    } catch (error) {
      res.status(400).send(`Webhook error: ${error.message}`);
    }

    try {
      if (event) {
        const { type } = event;
        if (relevantEvents.has(type)) {
          switch (type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
              const subscription = event.data.object as Stripe.Subscription;
              await saveSubscription(
                subscription.id,
                subscription.customer.toString(),
                false
              );
              break;
            case "checkout.session.completed":
              const checkoutSession = event.data
                .object as Stripe.Checkout.Session;
              await saveSubscription(
                checkoutSession.subscription.toString(),
                checkoutSession.customer.toString(),
                true
              );
              break;
            default:
              throw new Error("Unhandled event");
          }
        }
      }
    } catch (err) {
      return res.json({ error: `Webhook handler failed: ${err.message}` });
    }

    res.json({ received: true });
  } else {
    // res.setHeader("Allow", "POST");
    res.status(405).end("Method not allowed");
  }
};
