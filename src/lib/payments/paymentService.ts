import type { PaymentProvider } from './types'
import { getRazorpayProvider } from './providers/razorpay'
import { getCashfreeProvider } from './providers/cashfree'

/**
 * Returns the active PaymentProvider for the current configuration or the specified gateway.
 */
export function getPaymentProvider(gateway?: string): PaymentProvider {
    const activeGateway = gateway ?? process.env.PAYMENT_GATEWAY ?? 'razorpay'

    switch (activeGateway) {
        case 'razorpay':
            return getRazorpayProvider()
        case 'cashfree':
            return getCashfreeProvider()
        default:
            throw new Error(
                `Unsupported payment gateway: "${activeGateway}". ` +
                'Please specify a supported gateway (e.g. "razorpay" or "cashfree").'
            )
    }
}
