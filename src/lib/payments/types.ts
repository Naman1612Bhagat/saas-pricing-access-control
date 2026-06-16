/**
 * Shared type contracts for the payment provider abstraction layer.
 * All gateway implementations (Razorpay, Stripe, etc.) must conform to
 * the PaymentProvider interface so routes stay gateway-agnostic.
 */

// ─── Input types ────────────────────────────────────────────────────────────

export interface CreateOrderInput {
    amountInRupees: number
    currency: string
    /** Unique receipt reference for the payment gateway */
    receipt: string
    /** Arbitrary key-value metadata to attach to the order */
    notes?: Record<string, string>
}

export interface VerifyPaymentInput {
    /** Gateway-issued order identifier */
    orderId: string
    /** Gateway-issued payment identifier */
    paymentId: string
    /** HMAC signature provided by the gateway after checkout */
    signature: string
}

// ─── Result types ────────────────────────────────────────────────────────────

export interface CreateOrderResult {
    /** Gateway-issued order identifier to pass to the frontend checkout */
    gatewayOrderId: string
    /** Amount in the smallest currency unit (paise for INR) */
    amount: number
    currency: string
}

export interface VerifyPaymentResult {
    /** true if the signature is valid */
    valid: boolean
}

// ─── Provider interface ───────────────────────────────────────────────────────

/**
 * Every payment gateway must implement this interface.
 * Routes depend only on this contract — never on the SDK directly.
 */
export interface PaymentProvider {
    /**
     * Creates a payment order with the gateway and returns the gateway order id
     * that the frontend checkout widget needs.
     */
    createOrder(input: CreateOrderInput): Promise<CreateOrderResult>

    /**
     * Verifies the HMAC signature returned by the gateway after checkout.
     * Returns { valid: true } on success, { valid: false } on tampered data.
     */
    verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>
}
