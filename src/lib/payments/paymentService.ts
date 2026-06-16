import type { PaymentProvider } from './types'
import { getRazorpayProvider } from './providers/razorpay'

/**
 * Returns the active PaymentProvider for the current configuration.
 *
 * To add a new gateway in the future (e.g. Stripe), add a new case here
 * and implement the PaymentProvider interface in providers/stripe.ts.
 * No API route code needs to change.
 */
export function getPaymentProvider(): PaymentProvider {
    const gateway = process.env.PAYMENT_GATEWAY ?? 'razorpay'

    switch (gateway) {
        case 'razorpay':
            return getRazorpayProvider()
        default:
            throw new Error(
                `Unsupported payment gateway: "${gateway}". ` +
                'Set the PAYMENT_GATEWAY environment variable to a supported value (e.g. "razorpay").'
            )
    }
}
