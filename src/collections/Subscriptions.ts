import type { CollectionConfig } from 'payload'
import type { Plan } from '../payload-types'

export const Subscriptions: CollectionConfig = {
    slug: 'subscriptions',

    admin: {
        useAsTitle: 'status',
    },

    access: {
        read: ({ req }) => {
            if (!req.user) return false
            if (req.user.role === 'admin') return true
            return {
                user: {
                    equals: req.user.id,
                },
            }
        },
        create: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
        update: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
        delete: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
    },

    hooks: {
        beforeChange: [
            async ({ data, req, operation }) => {
                if (operation !== 'create') {
                    return data
                }

                let planId: string | number | undefined = undefined
                if (data.plan) {
                    if (typeof data.plan === 'object' && data.plan !== null && 'id' in data.plan) {
                        planId = (data.plan as { id: string | number }).id
                    } else if (typeof data.plan === 'string' || typeof data.plan === 'number') {
                        planId = data.plan
                    }
                }

                if (!planId) {
                    throw new Error('Plan is required to create a subscription.')
                }

                let plan: Plan | null = null
                try {
                    plan = await req.payload.findByID({
                        collection: 'plans',
                        id: planId,
                    })
                } catch (err) {
                    throw new Error(`Plan with ID "${planId}" not found.`)
                }

                if (!plan) {
                    throw new Error('Selected plan is invalid or does not exist.')
                }

                const validityDays = typeof plan.validityDays === 'number' ? plan.validityDays : parseInt(String(plan.validityDays), 10)
                if (isNaN(validityDays)) {
                    throw new Error('Selected plan has an invalid validity duration.')
                }

                const startDate = new Date()
                const expiryDate = new Date()
                expiryDate.setDate(startDate.getDate() + validityDays)

                return {
                    ...data,
                    startDate: startDate.toISOString(),
                    expiryDate: expiryDate.toISOString(),
                    status: 'active',
                }
            },
        ],
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
            name: 'amountPaid',
            type: 'number',
            required: true,
        },
        {
            name: 'startDate',
            type: 'date',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'expiryDate',
            type: 'date',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'status',
            type: 'select',
            defaultValue: 'active',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Expired', value: 'expired' },
                { label: 'Cancelled', value: 'cancelled' },
            ],
        },
    ],
}