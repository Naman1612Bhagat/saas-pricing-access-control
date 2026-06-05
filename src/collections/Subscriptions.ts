import type { CollectionConfig } from 'payload'

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
                try {
                    console.log('[Subscriptions Hook] beforeChange triggered.', {
                        operation,
                        data,
                    })

                    if (operation !== 'create') {
                        console.log('[Subscriptions Hook] Operation is not create. Skipping.')
                        return data
                    }

                    // 1. Resolve Plan ID
                    let planId: string | number | undefined = undefined
                    if (data.plan) {
                        if (typeof data.plan === 'object') {
                            planId = (data.plan as any).id
                        } else {
                            planId = data.plan
                        }
                    }

                    console.log('[Subscriptions Hook] Resolved planId:', planId)

                    if (!planId) {
                        console.error('[Subscriptions Hook] Error: Plan ID is missing in data.')
                        throw new Error('Plan is required to create a subscription.')
                    }

                    // 2. Fetch Plan Document
                    let plan: any = null
                    try {
                        plan = await req.payload.findByID({
                            collection: 'plans',
                            id: planId,
                        })
                    } catch (err: any) {
                        console.error(`[Subscriptions Hook] Error fetching plan by ID ${planId}:`, err)
                        throw new Error(`Plan with ID "${planId}" not found.`)
                    }

                    if (!plan) {
                        console.error(`[Subscriptions Hook] Error: Plan with ID ${planId} resolved to null.`)
                        throw new Error('Selected plan is invalid or does not exist.')
                    }

                    console.log('[Subscriptions Hook] Successfully fetched plan:', plan)

                    // 3. Verify Validity Days
                    const validityDays = typeof plan.validityDays === 'number' ? plan.validityDays : parseInt(plan.validityDays, 10)
                    if (isNaN(validityDays)) {
                        console.error('[Subscriptions Hook] Error: validityDays is not a valid number.', { validityDays: plan.validityDays })
                        throw new Error('Selected plan has an invalid validity duration.')
                    }

                    // 4. Generate Dates
                    const startDate = new Date()
                    const expiryDate = new Date()
                    expiryDate.setDate(startDate.getDate() + validityDays)

                    const updatedData = {
                        ...data,
                        startDate: startDate.toISOString(),
                        expiryDate: expiryDate.toISOString(),
                        status: 'active',
                    }

                    console.log('[Subscriptions Hook] Successfully generated subscription data:', updatedData)
                    return updatedData

                } catch (err: any) {
                    console.error('[Subscriptions Hook] Fatal Error in beforeChange hook:', err.message || err)
                    throw err // Propagate error so user sees meaningful message
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