import Razorpay from 'razorpay'

const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

if (!keyId || !keySecret) {
    throw new Error(
        'Missing Razorpay configuration. Please define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables.'
    )
}

export const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
})