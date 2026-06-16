import type {
    PaymentProvider,
    CreateOrderInput,
    CreateOrderResult,
    VerifyPaymentInput,
    VerifyPaymentResult,
} from '../types'

/**
 * Cashfree implementation placeholder of the PaymentProvider interface.
 * Returns descriptive errors as this gateway is not yet fully implemented.
 */
export class CashfreeProvider implements PaymentProvider {
    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
        throw new Error('Cashfree payment gateway is not implemented yet.')
    }

    async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
        throw new Error('Cashfree payment signature verification is not implemented yet.')
    }
}

let cashfreeProvider: CashfreeProvider | null = null

/**
 * Returns the lazily-initialised singleton CashfreeProvider.
 */
export function getCashfreeProvider(): CashfreeProvider {
    if (cashfreeProvider) {
        return cashfreeProvider
    }
    cashfreeProvider = new CashfreeProvider()
    return cashfreeProvider
}
