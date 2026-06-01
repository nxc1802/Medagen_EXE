import PayOS from '@payos/node';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { SupabaseClient } from '@supabase/supabase-js';

const PLANS = {
  pro_monthly: { amount: 229000, description: 'MedaGen Pro Monthly', billing: 'monthly' },
  pro_annual:  { amount: 1690000, description: 'MedaGen Pro Annual',  billing: 'annual'  },
} as const;

export type PlanKey = keyof typeof PLANS;

export class PaymentService {
  private payos: PayOS;
  private db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.payos = new PayOS(
      env.PAYOS_CLIENT_ID  ?? '',
      env.PAYOS_API_KEY    ?? '',
      env.PAYOS_CHECKSUM_KEY ?? ''
    );
    this.db = db;
  }

  async createOrder(userId: string, plan: PlanKey, userEmail: string) {
    const meta = PLANS[plan];
    // orderCode must be a unique positive integer — use timestamp-based ID
    const orderCode = Number(String(Date.now()).slice(-9));

    const paymentData = {
      orderCode,
      amount: meta.amount,
      description: meta.description,
      buyerEmail: userEmail,
      items: [{ name: meta.description, quantity: 1, price: meta.amount }],
      returnUrl: `${env.FRONTEND_URL}/payment/return?orderCode=${orderCode}`,
      cancelUrl:  `${env.FRONTEND_URL}/payment/cancel?orderCode=${orderCode}`,
    };

    const response = await this.payos.createPaymentLink(paymentData);

    // Persist pending order in DB
    await this.db.from('subscriptions').upsert({
      user_id: userId,
      plan: 'pro',
      billing: meta.billing,
      status: 'pending',
      payos_order_code: orderCode,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    logger.info({ userId, orderCode, plan }, 'PayOS order created');
    return { checkoutUrl: response.checkoutUrl, orderCode };
  }

  async handleWebhook(body: unknown) {
    const data = this.payos.verifyPaymentWebhookData(body as any);

    if (!data || data.code !== '00') {
      logger.warn({ data }, 'PayOS webhook: payment not successful');
      return { success: false };
    }

    const orderCode = data.orderCode;

    const { data: sub, error } = await this.db
      .from('subscriptions')
      .select('user_id, billing')
      .eq('payos_order_code', orderCode)
      .single();

    if (error || !sub) {
      logger.error({ orderCode }, 'PayOS webhook: subscription not found');
      return { success: false };
    }

    const endsAt = sub.billing === 'annual'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() +  30 * 24 * 60 * 60 * 1000);

    await this.db.from('subscriptions').update({
      status: 'active',
      starts_at: new Date().toISOString(),
      ends_at: endsAt.toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('payos_order_code', orderCode);

    logger.info({ orderCode, userId: sub.user_id }, 'PayOS webhook: subscription activated');
    return { success: true };
  }

  async getOrderStatus(orderCode: number) {
    return this.payos.getPaymentLinkInformation(orderCode);
  }

  async getUserSubscription(userId: string) {
    const { data } = await this.db
      .from('subscriptions')
      .select('plan, billing, status, starts_at, ends_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data;
  }
}
