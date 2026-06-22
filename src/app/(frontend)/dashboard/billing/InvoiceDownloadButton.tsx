'use client'

import { useState } from 'react'

interface InvoiceDownloadButtonProps {
    paymentId: number
    invoiceNumber: string
    compact?: boolean
}

function pdfSafeCurrency(amount: number, currency: string): string {
    const code = (currency || 'INR').toUpperCase()
    try {
        const num = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount)
        return `${code} ${num}`
    } catch {
        return `${code} ${amount}`
    }
}

function fmtDate(dateStr: string): string {
    try {
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date(dateStr))
    } catch {
        return dateStr
    }
}

function fmtDateTimeIST(dateStr: string): string {
    try {
        const d = new Date(dateStr)
        const fmt = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })
        const parts = fmt.formatToParts(d)
        const p = Object.fromEntries(parts.map((x) => [x.type, x.value]))
        const dayPeriod = (p.dayPeriod || '').toUpperCase()
        return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${dayPeriod} IST`
    } catch {
        return dateStr
    }
}

async function generateAndDownloadPDF(
    invoice: {
        id: number
        status: string
        amount: number
        currency: string
        gateway: string
        gatewayOrderId: string
        gatewayPaymentId: string | null
        createdAt: string
        plan: { id: number; name: string }
        customer: { name: string; email: string }
    },
    invoiceNumber: string,
) {
    // Dynamic import to prevent server-side Node canvas dependency.
    const { jsPDF } = await import('jspdf')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const PW = doc.internal.pageSize.getWidth()
    const PH = doc.internal.pageSize.getHeight()

    const INDIGO = [99, 102, 241] as const
    const DARK = [11, 15, 25] as const
    const SLATE = [148, 163, 184] as const
    const WHITE = [255, 255, 255] as const
    const BLACK = [15, 23, 42] as const
    const GREEN = [52, 211, 153] as const
    const MUTED = [100, 116, 139] as const

    const HEADER_H = 60
    doc.setFillColor(...DARK)
    doc.rect(0, 0, PW, HEADER_H, 'F')

    doc.setFillColor(...INDIGO)
    doc.rect(0, 0, 5, HEADER_H, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...WHITE)
    doc.text('Access', 14, 22)
    doc.setTextColor(...INDIGO)
    const accessW = doc.getTextWidth('Access')
    doc.text('Shield', 14 + accessW, 22)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...SLATE)
    doc.text('SaaS Access Control Platform', 14, 30)

    doc.setFontSize(7.5)
    doc.setTextColor(107, 114, 128)
    doc.text('support@accessshield.app  |  accessshield.app', 14, 37)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(26)
    doc.setTextColor(...INDIGO)
    doc.text('INVOICE', PW - 14, 24, { align: 'right' })

    doc.setFontSize(9)
    doc.setTextColor(...SLATE)
    doc.text(invoiceNumber, PW - 14, 33, { align: 'right' })

    doc.setFillColor(...WHITE)
    doc.rect(0, HEADER_H, PW, PH - HEADER_H, 'F')

    let y = HEADER_H + 14

    const col1 = 14
    const col2 = PW / 2 + 4

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE)
    doc.text('BILL TO', col1, y)
    doc.text('INVOICE DETAILS', col2, y)

    y += 6

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(invoice.customer.name || 'Customer', col1, y)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(invoice.customer.email || '—', col1, y + 6)

    const metaRows: [string, string, boolean][] = [
        ['Invoice Number', invoiceNumber, false],
        ['Invoice Date', fmtDate(invoice.createdAt), false],
        ['Payment Date', fmtDateTimeIST(invoice.createdAt), false],
        ['Payment Status', 'PAID', true],
    ]

    let metaY = y
    for (const [label, value, isGreen] of metaRows) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...SLATE)
        doc.text(label, col2, metaY)

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(isGreen ? GREEN[0] : BLACK[0], isGreen ? GREEN[1] : BLACK[1], isGreen ? GREEN[2] : BLACK[2])
        doc.text(value, PW - 14, metaY, { align: 'right' })
        metaY += 7
    }

    y += Math.max(12, metaRows.length * 7) + 6

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(14, y, PW - 14, y)
    y += 10

    doc.setFillColor(248, 250, 252)
    doc.rect(14, y - 4, PW - 28, 10, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE)
    doc.text('DESCRIPTION', col1 + 2, y + 2)
    doc.text('AMOUNT', PW - 16, y + 2, { align: 'right' })

    y += 14

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BLACK)
    doc.text(`${invoice.plan.name} Subscription`, col1 + 2, y)
    doc.text(pdfSafeCurrency(invoice.amount, invoice.currency), PW - 16, y, { align: 'right' })

    y += 6

    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    const gatewayLabel = invoice.gateway === 'razorpay' ? 'Razorpay' : invoice.gateway === 'paypal' ? 'PayPal' : invoice.gateway === 'cashfree' ? 'Cashfree' : invoice.gateway
    doc.text(`Payment via ${gatewayLabel}`, col1 + 2, y)

    y += 12

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(PW / 2, y, PW - 14, y)
    y += 7

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    doc.text('Subtotal', PW / 2, y)
    doc.text(pdfSafeCurrency(invoice.amount, invoice.currency), PW - 14, y, { align: 'right' })
    y += 6

    doc.setTextColor(...MUTED)
    doc.text('Tax / GST', PW / 2, y)
    doc.text('Included', PW - 14, y, { align: 'right' })
    y += 2

    doc.setDrawColor(226, 232, 240)
    doc.line(PW / 2, y, PW - 14, y)
    y += 7

    doc.setFillColor(238, 242, 255)
    doc.roundedRect(PW / 2 - 2, y - 5, PW - 14 - (PW / 2 - 2) + 2, 11, 2, 2, 'F')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INDIGO)
    doc.text('TOTAL', PW / 2 + 2, y + 2)
    doc.text(pdfSafeCurrency(invoice.amount, invoice.currency), PW - 16, y + 2, { align: 'right' })

    y += 18

    const REF_BOX_H = 46
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(14, y, PW - 28, REF_BOX_H, 3, 3, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(14, y, PW - 28, REF_BOX_H, 3, 3, 'S')

    y += 8

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE)
    doc.text('PAYMENT REFERENCE', 20, y)
    y += 7

    const refRows: [string, string][] = [
        ['Gateway', invoice.gateway === 'razorpay' ? 'Razorpay' : invoice.gateway === 'paypal' ? 'PayPal' : invoice.gateway === 'cashfree' ? 'Cashfree' : invoice.gateway],
        ['Order ID', invoice.gatewayOrderId],
        ['Payment ID', invoice.gatewayPaymentId ?? '—'],
        ['Currency', (invoice.currency || 'INR').toUpperCase()],
    ]

    for (const [label, value] of refRows) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...MUTED)
        doc.text(label, 20, y)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BLACK)
        doc.text(value, 80, y)
        y += 6
    }

    y += 10

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(148, 163, 184)
    doc.text(
        'This invoice was automatically generated by AccessShield. No signature required.',
        PW / 2,
        y,
        { align: 'center' },
    )

    y += 10

    const FOOTER_H = 32
    doc.setFillColor(...DARK)
    doc.rect(0, PH - FOOTER_H, PW, FOOTER_H, 'F')

    doc.setFillColor(...INDIGO)
    doc.rect(0, PH - FOOTER_H, 5, FOOTER_H, 'F')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text('Thank you for choosing AccessShield!', PW / 2, PH - FOOTER_H + 12, { align: 'center' })

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    doc.text(
        'support@accessshield.app  |  accessshield.app',
        PW / 2,
        PH - FOOTER_H + 20,
        { align: 'center' },
    )

    doc.setFontSize(6.5)
    doc.setTextColor(71, 85, 105)
    doc.text(
        `© ${new Date().getFullYear()} AccessShield. All rights reserved.`,
        PW / 2,
        PH - FOOTER_H + 27,
        { align: 'center' },
    )

    doc.save(`${invoiceNumber}.pdf`)
}

export function InvoiceDownloadButton({
    paymentId,
    invoiceNumber,
    compact = false,
}: InvoiceDownloadButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/invoices/${paymentId}`, {
                credentials: 'include',
            })

            if (!res.ok) {
                let msg = 'Failed to download invoice.'
                try {
                    const data = await res.json()
                    if (data?.error) msg = data.error
                } catch { }
                alert(msg)
                return
            }

            const { invoice } = await res.json()
            await generateAndDownloadPDF(invoice, invoiceNumber)
        } catch (err) {
            console.error('[InvoiceDownloadButton] Error:', err)
            alert('An unexpected error occurred while generating the invoice.')
        } finally {
            setLoading(false)
        }
    }

    const Spinner = ({ size }: { size: number }) => (
        <svg
            className="animate-spin"
            style={{ width: size, height: size }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    )

    const DownloadIcon = ({ size }: { size: number }) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    )

    if (compact) {
        return (
            <button
                onClick={handleDownload}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                           bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20
                           text-indigo-400 hover:text-indigo-300 text-xs font-semibold
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Download invoice ${invoiceNumber}`}
            >
                {loading ? (
                    <>
                        <Spinner size={14} />
                        Generating…
                    </>
                ) : (
                    <>
                        <DownloadIcon size={13} />
                        Download Invoice PDF
                    </>
                )}
            </button>
        )
    }

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20
                       text-indigo-400 hover:text-indigo-300 text-xs font-semibold
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                       whitespace-nowrap"
            title={`Download invoice ${invoiceNumber}`}
        >
            {loading ? (
                <>
                    <Spinner size={12} />
                    Generating…
                </>
            ) : (
                <>
                    <DownloadIcon size={12} />
                    Download PDF
                </>
            )}
        </button>
    )
}
