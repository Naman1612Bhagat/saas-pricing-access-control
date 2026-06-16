import crypto from 'crypto'
import Razorpay from 'razorpay'
import type {
    PaymentProvider,
    CreateOrderInput,
    CreateOrderResult,
    VerifyPaymentInput,
    VerifyPaymentResult,
} from '../types'

/**
 * Razorpay implementation of the PaymentProvider interface.
 *
 * All Razorpay SDK usage is isolated here. No other file in the codebase
 * imports from the 'razorpay' package directly.
 */
export class RazorpayProvider implements PaymentProvider {
    private client: Razorpay

    constructor(client: Razorpay) {
        this.client = client
    }

    /**
     * Creates a Razorpay order.
     * Converts rupees → paise (Razorpay expects smallest currency unit).
     */
    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
        const order = await this.client.orders.create({
            amount: input.amountInRupees * 100, // paise
            currency: input.currency,
            receipt: input.receipt,
            notes: input.notes ?? {},
        })

        return {
            gatewayOrderId: order.id,
            amount: typeof order.amount === 'number' ? order.amount : Number(order.amount),
            currency: order.currency,
        }
    }

    /**
     * Verifies the Razorpay HMAC-SHA256 webhook/checkout signature.
     * The signature is constructed as: HMAC(orderId + "|" + paymentId, keySecret)
     */
    async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
        const keySecret = process.env.RAZORPAY_KEY_SECRET
        if (!keySecret) {
            throw new Error('RAZORPAY_KEY_SECRET is not configured on the server')
        }

        const verificationBody = `${input.orderId}|${input.paymentId}`
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(verificationBody)
            .digest('hex')

        return { valid: expectedSignature === input.signature }
    }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let razorpayProvider: RazorpayProvider | null = null

/**
 * Returns a lazily-initialised singleton RazorpayProvider.
 * Credentials are read at call-time (not import-time) so the module
 * is safe to import during Next.js/Vercel build when env vars are absent.
 */
export function getRazorpayProvider(): RazorpayProvider {
    if (razorpayProvider) {
        return razorpayProvider
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
        throw new Error(
            'Missing Razorpay configuration. ' +
            'Please define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables.'
        )
    }

    const client = new Razorpay({ key_id: keyId, key_secret: keySecret })
    razorpayProvider = new RazorpayProvider(client)
    return razorpayProvider
}
