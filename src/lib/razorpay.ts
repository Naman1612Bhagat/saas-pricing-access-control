import Razorpay from 'razorpay'

let client: Razorpay | null = null

/**
 * Returns an initialized Razorpay client instance.
 * Postpones validation of credentials and initialization to call-time
 * to prevent Vercel/Next.js build errors when environment variables are not present.
 */
export function getRazorpayClient(): Razorpay {
    if (client) {
        return client
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
        throw new Error(
            'Missing Razorpay configuration. Please define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables.'
        )
    }

    client = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    })

    return client
}