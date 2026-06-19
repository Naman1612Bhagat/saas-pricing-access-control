import type { CollectionConfig } from 'payload'

export const PaymentGatewaySettings: CollectionConfig = {
    slug: 'payment-gateway-settings',

    admin: {
        useAsTitle: 'displayName',
    },

    access: {
        read: ({ req }) => req.user?.role === 'admin',
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
        delete: ({ req }) => req.user?.role === 'admin',
    },

    fields: [
        {
            name: 'gateway',
            type: 'select',
            options: [
                { label: 'Razorpay', value: 'razorpay' },
                { label: 'Cashfree', value: 'cashfree' },
            ],
            required: true,
            unique: true,
        },
        {
            name: 'displayName',
            type: 'text',
            required: true,
        },
        {
            name: 'isEnabled',
            type: 'checkbox',
            defaultValue: true,
            required: true,
        },
        {
            name: 'isTestMode',
            type: 'checkbox',
            defaultValue: true,
            required: true,
        },
        {
            name: 'sortOrder',
            type: 'number',
            defaultValue: 1,
            required: true,
        },
        {
            name: 'description',
            type: 'textarea',
        },
    ],
}
