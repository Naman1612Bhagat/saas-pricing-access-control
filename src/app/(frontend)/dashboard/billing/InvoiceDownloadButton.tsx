'use client'

import { useState } from 'react'

interface InvoiceDownloadButtonProps {
    paymentId: number
    /** Pre-computed invoice number, e.g. INV-2026-0001 */
    invoiceNumber: string
    /** Compact variant for mobile card view */
    compact?: boolean
}

// ─── PDF-safe formatters ──────────────────────────────────────────────────────

/**
 * Formats a currency amount without the ₹ symbol.
 *
 * jsPDF ships with only the core-14 PDF fonts (Helvetica, Times, Courier).
 * None of them include the Indian Rupee sign (U+20B9), so Intl.NumberFormat
 * with `style: 'currency'` produces a placeholder glyph (e.g. "¹899").
 *
 * We use a plain number formatter and prepend the ISO currency code so the
 * output is always legible: "INR 899", "USD 49", etc.
 */
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

/**
 * Formats a date string as a short date in Asia/Kolkata timezone.
 * Example: "18 June 2026"
 */
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

/**
 * Formats a date string as a full date + time in IST (Asia/Kolkata).
 * Example: "18 Jun 2026, 12:16 AM IST"
 */
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

// ─── PDF generation ───────────────────────────────────────────────────────────

/**
 * Generates and downloads a professional invoice PDF using jsPDF.
 * All PDF generation happens in the browser — no server canvas dependency.
 */
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
    // Dynamic import → client-side only, no Node canvas dependency
    const { jsPDF } = await import('jspdf')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const PW = doc.internal.pageSize.getWidth()   // 210 mm
    const PH = doc.internal.pageSize.getHeight()  // 297 mm

    const INDIGO = [99,  102, 241] as const   // #6366f1
    const DARK   = [11,  15,  25 ] as const   // #0b0f19
    const SLATE  = [148, 163, 184] as const   // slate-400
    const WHITE  = [255, 255, 255] as const
    const BLACK  = [15,  23,  42 ] as const   // slate-900
    const GREEN  = [52,  211, 153] as const   // emerald-400
    const MUTED  = [100, 116, 139] as const   // slate-500

    // ─── 1. Dark header band ─────────────────────────────────────────────────
    const HEADER_H = 60
    doc.setFillColor(...DARK)
    doc.rect(0, 0, PW, HEADER_H, 'F')

    // Indigo left-edge accent bar
    doc.setFillColor(...INDIGO)
    doc.rect(0, 0, 5, HEADER_H, 'F')

    // Brand name — "Access" white, "Shield" indigo
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...WHITE)
    doc.text('Access', 14, 22)
    doc.setTextColor(...INDIGO)
    const accessW = doc.getTextWidth('Access')
    doc.text('Shield', 14 + accessW, 22)

    // Tagline
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...SLATE)
    doc.text('SaaS Access Control Platform', 14, 30)

    // Company contact details below tagline
    doc.setFontSize(7.5)
    doc.setTextColor(107, 114, 128)   // gray-500 — subtler than SLATE
    doc.text('support@accessshield.app  |  accessshield.app', 14, 37)

    // "INVOICE" label — right-aligned
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(26)
    doc.setTextColor(...INDIGO)
    doc.text('INVOICE', PW - 14, 24, { align: 'right' })

    // Invoice number below the label
    doc.setFontSize(9)
    doc.setTextColor(...SLATE)
    doc.text(invoiceNumber, PW - 14, 33, { align: 'right' })

    // ─── 2. White content area ────────────────────────────────────────────────
    doc.setFillColor(...WHITE)
    doc.rect(0, HEADER_H, PW, PH - HEADER_H, 'F')

    let y = HEADER_H + 14   // current vertical cursor

    // ─── 3. Bill To / Invoice Details — two columns ──────────────────────────
    const col1 = 14
    const col2 = PW / 2 + 4

    // Section label row
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE)
    doc.text('BILL TO', col1, y)
    doc.text('INVOICE DETAILS', col2, y)

    y += 6

    // Customer name
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(invoice.customer.name || 'Customer', col1, y)

    // Customer email
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(invoice.customer.email || '—', col1, y + 6)

    // Invoice meta rows — right column
    // Payment date row uses full date+time in IST
    const metaRows: [string, string, boolean][] = [
        ['Invoice Number', invoiceNumber,                           false],
        ['Invoice Date',   fmtDate(invoice.createdAt),             false],
        ['Payment Date',   fmtDateTimeIST(invoice.createdAt),      false],
        ['Payment Status', 'PAID',                                  true],  // last flag = green
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

    // Advance y past the taller of the two columns
    y += Math.max(12, metaRows.length * 7) + 6

    // ─── 4. Thin divider ──────────────────────────────────────────────────────
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(14, y, PW - 14, y)
    y += 10

    // ─── 5. Line-items table ──────────────────────────────────────────────────
    // Header row background
    doc.setFillColor(248, 250, 252)
    doc.rect(14, y - 4, PW - 28, 10, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE)
    doc.text('DESCRIPTION', col1 + 2, y + 2)
    doc.text('AMOUNT', PW - 16, y + 2, { align: 'right' })

    y += 14

    // Single line item
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BLACK)
    doc.text(`${invoice.plan.name} Subscription`, col1 + 2, y)
    doc.text(pdfSafeCurrency(invoice.amount, invoice.currency), PW - 16, y, { align: 'right' })

    y += 6

    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    const gatewayLabel = invoice.gateway === 'razorpay' ? 'Razorpay' : invoice.gateway
    doc.text(`Payment via ${gatewayLabel}`, col1 + 2, y)

    y += 12

    // ─── 6. Totals section ────────────────────────────────────────────────────
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

    // Total row — indigo-tinted highlight
    doc.setFillColor(238, 242, 255)
    doc.roundedRect(PW / 2 - 2, y - 5, PW - 14 - (PW / 2 - 2) + 2, 11, 2, 2, 'F')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INDIGO)
    doc.text('TOTAL', PW / 2 + 2, y + 2)
    doc.text(pdfSafeCurrency(invoice.amount, invoice.currency), PW - 16, y + 2, { align: 'right' })

    y += 18

    // ─── 7. Payment reference box ─────────────────────────────────────────────
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
        ['Gateway',    invoice.gateway === 'razorpay' ? 'Razorpay' : invoice.gateway],
        ['Order ID',   invoice.gatewayOrderId],
        ['Payment ID', invoice.gatewayPaymentId ?? '—'],
        ['Currency',   (invoice.currency || 'INR').toUpperCase()],
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

    // ─── 8. Auto-generated note ───────────────────────────────────────────────
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(148, 163, 184)   // slate-400
    doc.text(
        'This invoice was automatically generated by AccessShield. No signature required.',
        PW / 2,
        y,
        { align: 'center' },
    )

    // ─── 9. Footer band ───────────────────────────────────────────────────────
    const FOOTER_H = 32
    doc.setFillColor(...DARK)
    doc.rect(0, PH - FOOTER_H, PW, FOOTER_H, 'F')

    // Indigo left accent on footer
    doc.setFillColor(...INDIGO)
    doc.rect(0, PH - FOOTER_H, 5, FOOTER_H, 'F')

    // Thank-you line
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text('Thank you for choosing AccessShield!', PW / 2, PH - FOOTER_H + 12, { align: 'center' })

    // Contact + website
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    doc.text(
        'support@accessshield.app  |  accessshield.app',
        PW / 2,
        PH - FOOTER_H + 20,
        { align: 'center' },
    )

    // Tiny copyright line
    doc.setFontSize(6.5)
    doc.setTextColor(71, 85, 105)
    doc.text(
        `© ${new Date().getFullYear()} AccessShield. All rights reserved.`,
        PW / 2,
        PH - FOOTER_H + 27,
        { align: 'center' },
    )

    // ─── 10. Save ─────────────────────────────────────────────────────────────
    doc.save(`${invoiceNumber}.pdf`)
}

// ─── React component ──────────────────────────────────────────────────────────

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
                } catch { /* ignore JSON parse failure */ }
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

    // ── Spinner SVG (shared) ──────────────────────────────────────────────────
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

    // ── Download icon SVG (shared) ────────────────────────────────────────────
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
        // ── Mobile / compact variant ──────────────────────────────────────────
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

    // ── Table / default variant ───────────────────────────────────────────────
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
