import type { CollectionConfig } from 'payload'

export const FeatureUsages: CollectionConfig = {
    slug: 'feature-usages',

    admin: {
        useAsTitle: 'id',
    },

    access: {
        read: ({ req }) => {
            if (!req.user) return false
            if (req.user.role === 'admin') return true
            return {
                'subscription.user': {
                    equals: req.user.id,
                },
            }
        },
        create: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
        update: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
        delete: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
    },

    fields: [
        {
            name: 'subscription',
            type: 'relationship',
            relationTo: 'subscriptions',
            required: true,
        },
        {
            name: 'feature',
            type: 'relationship',
            relationTo: 'features',
            required: true,
        },
        {
            name: 'count',
            type: 'number',
            defaultValue: 0,
            required: true,
            min: 0,
        },
        {
            name: 'lastReset',
            type: 'date',
            required: true,
            defaultValue: () => new Date().toISOString(),
        },
    ],
}
