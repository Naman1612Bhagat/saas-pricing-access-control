export interface CreateOrderInput {
    amountInRupees: number
    currency: string
    receipt: string
    notes?: Record<string, string>
    customerDetails?: {
        id: string
        email: string
        name?: string
        phone?: string
    }
}

export interface VerifyPaymentInput {
    orderId: string
    paymentId: string
    signature: string
}

export interface CreateOrderResult {
    gatewayOrderId: string
    amount: number
    currency: string
    paymentSessionId?: string  // Cashfree only
}

export interface VerifyPaymentResult {
    valid: boolean
    gatewayPaymentId?: string
}

export interface PaymentProvider {
    createOrder(input: CreateOrderInput): Promise<CreateOrderResult>
    verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>
}
