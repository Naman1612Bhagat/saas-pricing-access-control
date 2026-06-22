'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { incrementReportUsageAction } from '@/app/actions'

type Props = {
    initialUsage: number
    limitType: string
    limitValue: number | null
}

export default function ExportReportsClient({ initialUsage, limitType, limitValue }: Props) {
    const router = useRouter()
    const [usageCount, setUsageCount] = useState(initialUsage)
    const [reportType, setReportType] = useState('sales')
    const [dateRange, setDateRange] = useState('30days')
    const [fileFormat, setFileFormat] = useState('csv')
    const [isExporting, setIsExporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

    const isLimitReached = limitType === 'limited' && limitValue !== null && usageCount >= limitValue

    const triggerDownload = () => {
        const headers = ['Date', 'Metric', 'Value', 'Source']
        const rows = [
            ['2026-06-01', 'Active Subscriptions', '142', 'Stripe'],
            ['2026-06-02', 'Total Sales Revenue', 'INR 48,990', 'Razorpay'],
            ['2026-06-03', 'API Verification Latency', '42ms', 'Vercel Logs'],
        ]

        let fileContent = ''
        let mimeType = 'text/csv'
        let fileExtension = 'csv'

        if (fileFormat === 'csv') {
            fileContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n')
        } else {
            mimeType = 'application/json'
            fileExtension = 'json'
            fileContent = JSON.stringify({
                reportTitle: `${reportType.toUpperCase()} Report - ${dateRange}`,
                generatedAt: new Date().toISOString(),
                headers,
                data: rows,
            }, null, 2)
        }

        const blob = new Blob([fileContent], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `AccessShield_${reportType}_report_${dateRange}.${fileExtension}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleExport = async () => {
        if (isLimitReached) {
            setMessage({ text: 'Access Denied: You have reached your usage limit for this plan.', isError: true })
            return
        }

        setMessage(null)
        setIsExporting(true)
        setProgress(10)

        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 80) {
                    clearInterval(interval)
                    return 80
                }
                return prev + 15
            })
        }, 150)

        try {
            const res = await incrementReportUsageAction()
            
            clearInterval(interval)
            
            if (res.success) {
                setProgress(100)
                setUsageCount(prev => prev + 1)
                
                triggerDownload()
                
                setMessage({ text: 'Report exported successfully! Your download has started.', isError: false })
                router.refresh()
            } else {
                setMessage({ text: res.error || 'Failed to export report.', isError: true })
            }
        } catch (err: any) {
            console.error('Error during report export handler:', err)
            setMessage({ text: 'An unexpected error occurred during export.', isError: true })
        } finally {
            setIsExporting(false)
            setTimeout(() => setProgress(0), 1000)
        }
    }

    return (
        <div className="bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 rounded-3xl p-6 sm:p-8 space-y-8 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-[#1f293d]/50 pb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Reports Engine</h2>
                    <p className="text-sm text-slate-400">Configure parameters and compile your CSV or JSON data export.</p>
                </div>
                <div className="bg-[#0d121f]/60 px-4 py-2 rounded-xl border border-[#1f293d]/30 text-right">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Plan Usage</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                        {limitType === 'unlimited' ? `${usageCount} / Unlimited` : `${usageCount} / ${limitValue} Used`}
                    </div>
                </div>
            </div>

            {message && (
                <div
                    className={`p-4 rounded-xl border text-sm text-center ${
                        message.isError
                            ? 'bg-red-900/30 border-red-500/50 text-red-200'
                            : 'bg-indigo-950/30 border-indigo-500/50 text-indigo-200'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Report Type</label>
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        disabled={isExporting || isLimitReached}
                        className="w-full bg-[#0d121f] border border-[#232d42] text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    >
                        <option value="sales">Sales Summary</option>
                        <option value="usage">Usage Metrics</option>
                        <option value="users">User Enrollments</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Date Range</label>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        disabled={isExporting || isLimitReached}
                        className="w-full bg-[#0d121f] border border-[#232d42] text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    >
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="90days">Last 90 Days</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">File Format</label>
                    <select
                        value={fileFormat}
                        onChange={(e) => setFileFormat(e.target.value)}
                        disabled={isExporting || isLimitReached}
                        className="w-full bg-[#0d121f] border border-[#232d42] text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    >
                        <option value="csv">Standard CSV</option>
                        <option value="json">Structured JSON</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                <button
                    onClick={handleExport}
                    disabled={isExporting || isLimitReached}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50 text-center text-sm"
                >
                    {isExporting ? 'Compiling Report Data...' : isLimitReached ? 'Usage Limit Reached' : 'Compile & Export Report'}
                </button>

                {progress > 0 && (
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-200"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
