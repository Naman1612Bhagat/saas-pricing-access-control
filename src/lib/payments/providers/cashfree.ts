import type {
    PaymentProvider,
    CreateOrderInput,
    CreateOrderResult,
    VerifyPaymentInput,
    VerifyPaymentResult,
} from '../types'

export class CashfreeProvider implements PaymentProvider {
    private getCredentials() {
        const clientId = process.env.CASHFREE_CLIENT_ID
        const clientSecret = process.env.CASHFREE_CLIENT_SECRET
        const env = process.env.CASHFREE_ENV || 'sandbox'

        if (!clientId || !clientSecret) {
            throw new Error(
                'Missing Cashfree configuration. ' +
                'Please define CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in your environment variables.'
            )
        }

        const baseUrl = env === 'production'
            ? 'https://api.cashfree.com/pg'
            : 'https://sandbox.cashfree.com/pg'

        return { clientId, clientSecret, baseUrl }
    }

    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
        const { clientId, clientSecret, baseUrl } = this.getCredentials()

        // Unique Cashfree order ID (max 45 chars).
        const sanitizedReceipt = input.receipt.replace(/[^a-zA-Z0-9_-]/g, '_')
        const cfOrderId = `cf_${sanitizedReceipt}_${Date.now()}`.substring(0, 45)

        const customerId = input.customerDetails?.id || `user_${Date.now()}`
        const customerEmail = input.customerDetails?.email || 'placeholder@accessshield.app'
        const customerPhone = input.customerDetails?.phone || '9999999999'

        const body: Record<string, any> = {
            order_id: cfOrderId,
            order_amount: input.amountInRupees,
            order_currency: input.currency || 'INR',
            customer_details: {
                customer_id: customerId,
                customer_email: customerEmail,
                customer_phone: customerPhone,
            },
        }

        if (input.notes?.returnUrl) {
            body.order_meta = {
                return_url: input.notes.returnUrl,
            }
        }

        const response = await fetch(`${baseUrl}/orders`, {
            method: 'POST',
            headers: {
                'x-client-id': clientId,
                'x-client-secret': clientSecret,
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Cashfree order creation error response:', data)
            throw new Error(data.message || 'Failed to create order with Cashfree')
        }

        return {
            gatewayOrderId: data.order_id,
            amount: Math.round(Number(data.order_amount) * 100), // convert rupees to paise
            currency: data.order_currency,
            paymentSessionId: data.payment_session_id,
        }
    }

    async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
        const { clientId, clientSecret, baseUrl } = this.getCredentials()

        const orderResponse = await fetch(`${baseUrl}/orders/${input.orderId}`, {
            method: 'GET',
            headers: {
                'x-client-id': clientId,
                'x-client-secret': clientSecret,
                'x-api-version': '2023-08-01',
            },
        })

        const orderData = await orderResponse.json()

        if (!orderResponse.ok) {
            console.error(`Failed to fetch Cashfree order status for ${input.orderId}:`, orderData)
            return { valid: false }
        }

        if (orderData.order_status !== 'PAID') {
            console.warn(`Cashfree order status for ${input.orderId} is ${orderData.order_status}`)
            return { valid: false }
        }

        const paymentsResponse = await fetch(`${baseUrl}/orders/${input.orderId}/payments`, {
            method: 'GET',
            headers: {
                'x-client-id': clientId,
                'x-client-secret': clientSecret,
                'x-api-version': '2023-08-01',
            },
        })

        if (!paymentsResponse.ok) {
            console.error(`Failed to fetch Cashfree order payments for ${input.orderId}`)
            return { valid: true } // still valid since order status was PAID
        }

        const paymentsData = await paymentsResponse.json()

        let gatewayPaymentId: string | undefined
        if (Array.isArray(paymentsData)) {
            const successfulPayment = paymentsData.find(p => p.payment_status === 'SUCCESS')
            if (successfulPayment) {
                gatewayPaymentId = String(successfulPayment.cf_payment_id)
            }
        }

        return {
            valid: true,
            gatewayPaymentId,
        }
    }
}

let cashfreeProvider: CashfreeProvider | null = null

export function getCashfreeProvider(): CashfreeProvider {
    if (cashfreeProvider) {
        return cashfreeProvider
    }
    cashfreeProvider = new CashfreeProvider()
    return cashfreeProvider
}
