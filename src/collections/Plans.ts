import type { CollectionConfig } from 'payload'

export const Plans: CollectionConfig = {
    slug: 'plans',

    admin: {
        useAsTitle: 'name',
    },

    access: {
        read: () => true,
        create: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
        update: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
        delete: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
    },

    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
        },
        {
            name: 'price',
            type: 'number',
            required: true,
        },
        {
            name: 'validityDays',
            type: 'number',
            required: true,
        },
        {
            name: 'featureLimits',
            type: 'array',
            required: true,
            fields: [
                {
                    name: 'feature',
                    type: 'relationship',
                    relationTo: 'features',
                    required: true,
                },
                {
                    name: 'limitType',
                    type: 'select',
                    required: true,
                    options: [
                        { label: 'Disabled', value: 'disabled' },
                        { label: 'Limited', value: 'limited' },
                        { label: 'Unlimited', value: 'unlimited' },
                    ],
                },
                {
                    name: 'limitValue',
                    type: 'number',
                    admin: {
                        condition: (data, siblingData) => siblingData?.limitType === 'limited',
                    },
                },
            ],
        },
        {
            name: 'isActive',
            type: 'checkbox',
            defaultValue: true,
        },
    ],
}