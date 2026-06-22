import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { redirect } from 'next/navigation'
import BillingHistoryClient from './BillingHistoryClient'

export const dynamic = 'force-dynamic'

export default async function BillingHistoryPage() {
    const headers = await getHeaders()
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    let user: any = null
    try {
        const authResult = await payload.auth({ headers })
        user = authResult.user
    } catch (e) {
    }

    if (!user) {
        redirect('/login')
    }

    const paymentsResult = await payload.find({
        collection: 'payments',
        where: {
            user: {
                equals: user.id,
            },
        },
        depth: 1,
        sort: '-createdAt',
        limit: 100,
    })

    const payments = paymentsResult.docs as any[]

    return (
        <div className="bg-[#0b0f19] py-12 px-4 sm:px-6 lg:px-8 flex-grow">
            <div className="max-w-5xl mx-auto space-y-8">
                <BillingHistoryClient payments={payments} />
            </div>
        </div>
    )
}
