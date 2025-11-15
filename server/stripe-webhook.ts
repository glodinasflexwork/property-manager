import { Request, Response } from "express";
import Stripe from "stripe";
import * as db from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

/**
 * Stripe Webhook Handler
 * Processes subscription events and updates database accordingly
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Webhook] Missing stripe-signature header");
    return res.status(400).send("Missing signature");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events - MUST return verification response
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  console.log(`[Webhook] Processing event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[Webhook] Checkout completed:", session.id);

  const organizationId = session.metadata?.organization_id;
  const userId = session.metadata?.user_id;

  if (!organizationId || !userId) {
    console.error("[Webhook] Missing metadata in checkout session");
    return;
  }

  // Update or create subscription record
  if (session.subscription) {
    await db.upsertSubscription({
      organizationId: parseInt(organizationId),
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Will be updated by subscription event
    });
  }
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[Webhook] Subscription updated:", subscription.id);

  // Find organization by customer ID
  const existingSubscription = await db.getSubscriptionByStripeId(subscription.id);
  
  if (!existingSubscription) {
    console.log("[Webhook] Subscription not found in database, skipping update");
    return;
  }

  // Map Stripe status to our enum
  const statusMap: Record<string, "active" | "canceled" | "past_due" | "trialing" | "incomplete"> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    unpaid: "past_due",
    paused: "canceled",
  };
  
  await db.updateSubscription(existingSubscription.id, {
    status: statusMap[subscription.status] || "canceled",
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
  });
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[Webhook] Subscription deleted:", subscription.id);

  const existingSubscription = await db.getSubscriptionByStripeId(subscription.id);
  
  if (existingSubscription) {
    await db.updateSubscription(existingSubscription.id, {
      status: "canceled",
    });
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[Webhook] Invoice paid:", invoice.id);
  
  // Update subscription status if needed
  const subscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription?.id;
  if (subscriptionId) {
    const existingSubscription = await db.getSubscriptionByStripeId(subscriptionId);
    
    if (existingSubscription) {
      await db.updateSubscription(existingSubscription.id, {
        status: "active",
      });
    }
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.error("[Webhook] Invoice payment failed:", invoice.id);
  
  // Update subscription status
  const subscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription?.id;
  if (subscriptionId) {
    const existingSubscription = await db.getSubscriptionByStripeId(subscriptionId);
    
    if (existingSubscription) {
      await db.updateSubscription(existingSubscription.id, {
        status: "past_due",
      });
    }
  }
}
