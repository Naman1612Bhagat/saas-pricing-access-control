'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { simulateTimeTravel, incrementReportUsageAction } from '@/app/actions'

type Props = {
    subscriptionId: string | number
}

export default function DashboardClient({ subscriptionId }: Props) {
    const router = useRouter()
    const [isTimeTraveling, startTimeTravel] = useTransition()
    const [isIncrementing, startIncrement] = useTransition()
    const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null)

    const handleTimeTravel = (days: number) => {
        setStatusMessage(null)
        startTimeTravel(async () => {
            const res = await simulateTimeTravel(subscriptionId, days)
            if (res.success) {
                setStatusMessage({ text: `Simulated: Shifted subscription ${days} days into the past!`, isError: false })
                router.refresh()
            } else {
                setStatusMessage({ text: res.error || 'Failed to simulate time travel.', isError: true })
            }
        })
    }

    const handleIncrementUsage = () => {
        setStatusMessage(null)
        startIncrement(async () => {
            const res = await incrementReportUsageAction()
            if (res.success) {
                setStatusMessage({ text: 'Report exported successfully! Usage count incremented.', isError: false })
                router.refresh()
            } else {
                setStatusMessage({ text: res.error || 'Failed to export report.', isError: true })
            }
        })
    }

    return (
        <div className="space-y-8">
            {/* Status Messages */}
            {statusMessage && (
                <div
                    className={`p-4 rounded-xl border text-sm text-center ${
                        statusMessage.isError
                            ? 'bg-red-900/30 border-red-500/50 text-red-200'
                            : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                    }`}
                >
                    {statusMessage.text}
                </div>
            )}

            {/* Test Actions */}
            <div className="bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 p-6 sm:p-8 rounded-3xl space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Simulate Feature Usage</h3>
                    <p className="text-sm text-slate-400">
                        Click below to simulate exporting a report. This will attempt to check your subscription rights and increment your usage.
                    </p>
                </div>

                <button
                    onClick={handleIncrementUsage}
                    disabled={isIncrementing || isTimeTraveling}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                    {isIncrementing ? 'Exporting...' : 'Simulate Report Export 📥'}
                </button>
            </div>

            {/* Subscription Testing Widget */}
            <div className="bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 p-6 sm:p-8 rounded-3xl space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Subscription Testing</h3>
                    <p className="text-sm text-slate-400">
                        Test your subscription expiry by fast-forwarding dates. Use the buttons below to simulate days passing.
                    </p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => handleTimeTravel(7)}
                        disabled={isTimeTraveling || isIncrementing}
                        className="bg-[#1f293d] hover:bg-[#2d3a54] border border-[#2d3a54] text-white font-semibold py-2 px-4 rounded-xl transition-all cursor-pointer text-sm disabled:opacity-50"
                    >
                        Fast Forward 7 Days
                    </button>
                    <button
                        onClick={() => handleTimeTravel(30)}
                        disabled={isTimeTraveling || isIncrementing}
                        className="bg-[#1f293d] hover:bg-[#2d3a54] border border-[#2d3a54] text-white font-semibold py-2 px-4 rounded-xl transition-all cursor-pointer text-sm disabled:opacity-50"
                    >
                        Fast Forward 30 Days (Force Expiry)
                    </button>
                </div>
            </div>
        </div>
    )
}
