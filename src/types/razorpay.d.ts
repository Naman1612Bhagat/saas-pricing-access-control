export {}

declare global {
    interface RazorpayResponse {
        razorpay_payment_id: string
        razorpay_order_id: string
        razorpay_signature: string
    }

    interface RazorpayOptions {
        key: string
        amount: number
        currency: string
        name: string
        description: string
        order_id: string
        handler: (response: RazorpayResponse) => void | Promise<void>
        modal?: {
            ondismiss?: () => void
        }
        theme?: {
            color?: string
        }
        prefill?: {
            name?: string
            email?: string
            contact?: string
        }
    }

    interface Window {
        Razorpay: new (options: RazorpayOptions) => {
            open: () => void
        }
    }
}