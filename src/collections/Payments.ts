import type { CollectionConfig } from 'payload'

export const Payments: CollectionConfig = {
    slug: 'payments',

    admin: {
        useAsTitle: 'gatewayOrderId',
    },

    access: {
        read: ({ req }) => {
            // Admin can see all payments
            if (req.user?.role === 'admin') {
                return true
            }

            // Users can only see their own payments
            return {
                user: {
                    equals: req.user?.id,
                },
            }
        },

        create: ({ req }) => Boolean(req.user),

        update: ({ req }) => req.user?.role === 'admin',

        delete: ({ req }) => req.user?.role === 'admin',
    },

    fields: [
        {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            required: true,
        },

        {
            name: 'plan',
            type: 'relationship',
            relationTo: 'plans',
            required: true,
        },

        {
            name: 'amount',
            type: 'number',
            required: true,
        },

        {
            name: 'currency',
            type: 'text',
            defaultValue: 'INR',
            required: true,
        },

        {
            name: 'gateway',
            type: 'select',
            defaultValue: 'razorpay',
            options: [
                {
                    label: 'Razorpay',
                    value: 'razorpay',
                },
                {
                    label: 'Cashfree',
                    value: 'cashfree',
                },
            ],
            required: true,
        },

        {
            name: 'gatewayOrderId',
            type: 'text',
            required: true,
        },

        {
            name: 'gatewayPaymentId',
            type: 'text',
        },

        {
            name: 'gatewaySignature',
            type: 'text',
        },

        {
            name: 'razorpayOrderId',
            type: 'text',
        },

        {
            name: 'razorpayPaymentId',
            type: 'text',
        },

        {
            name: 'razorpaySignature',
            type: 'text',
        },

        {
            name: 'status',
            type: 'select',
            defaultValue: 'created',
            options: [
                {
                    label: 'Created',
                    value: 'created',
                },
                {
                    label: 'Paid',
                    value: 'paid',
                },
                {
                    label: 'Failed',
                    value: 'failed',
                },
            ],
            required: true,
        },
    ],
}