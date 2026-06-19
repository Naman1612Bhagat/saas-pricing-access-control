import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
    try {
        const payload = await getPayload({ config })

        // Query enabled gateways from database sorted by sortOrder ascending
        const result = await payload.find({
            collection: 'payment-gateway-settings',
            where: {
                isEnabled: {
                    equals: true,
                },
            },
            sort: 'sortOrder',
            limit: 10,
        })

        // Map to safe fields: gateway, displayName, description
        const enabledGateways = result.docs.map((doc: any) => ({
            gateway: doc.gateway,
            displayName: doc.displayName,
            description: doc.description || null,
        }))

        return NextResponse.json(enabledGateways)
    } catch (error) {
        console.error('Error fetching enabled payment gateways:', error)
        return NextResponse.json({ error: 'Failed to retrieve available payment gateways' }, { status: 500 })
    }
}
