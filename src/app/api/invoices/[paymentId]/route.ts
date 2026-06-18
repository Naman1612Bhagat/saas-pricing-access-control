import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * GET /api/invoices/[paymentId]
 *
 * Returns payment data required to generate an invoice PDF.
 *
 * Access control:
 *  - User must be authenticated.
 *  - Regular user may only access their own payment records.
 *  - Admin users may access any payment record.
 *  - Only payments with status "paid" are eligible for invoice generation.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ paymentId: string }> },
) {
    try {
        const { paymentId } = await params
        const payload = await getPayload({ config })

        // 1. Authenticate request
        const { user } = await payload.auth({ headers: req.headers })
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized — please log in first' }, { status: 401 })
        }

        // 2. Validate paymentId param
        const paymentIdNum = parseInt(paymentId, 10)
        if (isNaN(paymentIdNum) || paymentIdNum <= 0) {
            return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
        }

        // 3. Fetch payment record (depth=1 resolves plan and user relations)
        let payment: any
        try {
            payment = await payload.findByID({
                collection: 'payments',
                id: paymentIdNum,
                depth: 1,
            })
        } catch {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
        }

        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
        }

        // 4. Ownership / role check
        const paymentUserId =
            typeof payment.user === 'object' && payment.user !== null
                ? payment.user.id
                : payment.user

        const isAdmin = user.role === 'admin'
        const isOwner = Number(paymentUserId) === Number(user.id)

        if (!isAdmin && !isOwner) {
            return NextResponse.json(
                { error: 'Forbidden — you do not have access to this invoice' },
                { status: 403 },
            )
        }

        // 5. Status guard — invoices are only valid for paid payments
        if (payment.status !== 'paid') {
            return NextResponse.json(
                { error: 'Invoice is only available for payments with status "paid"' },
                { status: 400 },
            )
        }

        // 6. Return sanitised payment data (omit sensitive signature)
        const invoiceData = {
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            gateway: payment.gateway,
            razorpayOrderId: payment.razorpayOrderId,
            razorpayPaymentId: payment.razorpayPaymentId ?? null,
            createdAt: payment.createdAt,
            plan:
                typeof payment.plan === 'object' && payment.plan !== null
                    ? { id: payment.plan.id, name: payment.plan.name }
                    : { id: payment.plan, name: 'Unknown Plan' },
            customer:
                typeof payment.user === 'object' && payment.user !== null
                    ? { name: payment.user.name ?? '', email: payment.user.email ?? '' }
                    : { name: '', email: '' },
        }

        return NextResponse.json({ invoice: invoiceData })
    } catch (error) {
        console.error('[/api/invoices] Unexpected error:', error)
        return NextResponse.json({ error: 'Failed to retrieve invoice data' }, { status: 500 })
    }
}
