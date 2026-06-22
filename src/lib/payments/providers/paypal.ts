import type {
    PaymentProvider,
    CreateOrderInput,
    CreateOrderResult,
    VerifyPaymentInput,
    VerifyPaymentResult,
} from '../types'

export function convertInrToUsd(amountInInr: number): number {
    const rateStr = process.env.PAYPAL_USD_CONVERSION_RATE
    if (!rateStr) {
        throw new Error('PayPal conversion rate is not configured.')
    }
    const rate = parseFloat(rateStr)
    if (isNaN(rate) || rate <= 0) {
        throw new Error('PayPal conversion rate is invalid.')
    }
    const converted = amountInInr * rate
    return Math.max(Math.round(converted * 100) / 100, 1.00)
}

export class PayPalProvider implements PaymentProvider {
    private getCredentials() {
        const clientId = process.env.PAYPAL_CLIENT_ID
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET
        const env = process.env.PAYPAL_ENV || 'sandbox'

        if (!clientId || !clientSecret) {
            throw new Error(
                'Missing PayPal configuration. ' +
                'Please define PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment variables.'
            )
        }

        const baseUrl = env === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com'

        return { clientId, clientSecret, baseUrl }
    }

    private async getAccessToken(clientId: string, clientSecret: string, baseUrl: string): Promise<string> {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        })

        const data = await response.json()
        if (!response.ok) {
            console.error('PayPal OAuth token retrieval failed:', data)
            throw new Error(data.error_description || 'Failed to authenticate with PayPal')
        }

        return data.access_token
    }

    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
        const { clientId, clientSecret, baseUrl } = this.getCredentials()
        const accessToken = await this.getAccessToken(clientId, clientSecret, baseUrl)

        const amountInUSD = convertInrToUsd(input.amountInRupees)

        const body = {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: 'USD',
                        value: amountInUSD.toFixed(2),
                    },
                    custom_id: input.receipt,
                }
            ]
        }

        const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(body),
        })

        const data = await response.json()
        if (!response.ok) {
            console.error('PayPal order creation failed:', data)
            throw new Error(data.message || 'Failed to create PayPal order')
        }

        return {
            gatewayOrderId: data.id,
            amount: Math.round(amountInUSD * 100),
            currency: 'USD',
        }
    }

    async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
        const { clientId, clientSecret, baseUrl } = this.getCredentials()
        const accessToken = await this.getAccessToken(clientId, clientSecret, baseUrl)

        const response = await fetch(`${baseUrl}/v2/checkout/orders/${input.orderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })

        const data = await response.json()
        if (!response.ok) {
            console.error(`Failed to fetch PayPal order status for ${input.orderId}:`, data)
            return { valid: false }
        }

        const isCompleted = data.status === 'COMPLETED'
        let gatewayPaymentId: string | undefined
        if (isCompleted) {
            const capture = data.purchase_units?.[0]?.payments?.captures?.[0]
            if (capture && capture.status === 'COMPLETED') {
                gatewayPaymentId = capture.id
            }
        }

        return {
            valid: isCompleted,
            gatewayPaymentId,
        }
    }

    async captureOrder(orderId: string): Promise<{ valid: boolean; gatewayPaymentId?: string; error?: string }> {
        const { clientId, clientSecret, baseUrl } = this.getCredentials()
        const accessToken = await this.getAccessToken(clientId, clientSecret, baseUrl)

        const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({}),
        })

        const data = await response.json()
        if (!response.ok) {
            console.error('PayPal order capture failed:', data)
            return { valid: false, error: data.message || 'Failed to capture PayPal order' }
        }

        const isCompleted = data.status === 'COMPLETED'
        let gatewayPaymentId: string | undefined
        if (isCompleted) {
            const capture = data.purchase_units?.[0]?.payments?.captures?.[0]
            if (capture && capture.status === 'COMPLETED') {
                gatewayPaymentId = capture.id
            }
        }

        return {
            valid: isCompleted && !!gatewayPaymentId,
            gatewayPaymentId,
        }
    }
}

let paypalProvider: PayPalProvider | null = null

export function getPayPalProvider(): PayPalProvider {
    if (paypalProvider) {
        return paypalProvider
    }
    paypalProvider = new PayPalProvider()
    return paypalProvider
}
