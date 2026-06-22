import type { CollectionConfig } from 'payload'

export const Features: CollectionConfig = {
    slug: 'features',
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
            name: 'key',
            type: 'text',
            required: true,
            unique: true,
        },
        {
            name: 'description',
            type: 'textarea',
        },
    ],
}