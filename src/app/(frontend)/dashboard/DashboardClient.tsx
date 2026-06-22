'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { simulateTimeTravel, incrementReportUsageAction } from '@/app/actions'
import { Zap, Clock, ShieldAlert, FileDown } from 'lucide-react'

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
        <div className="space-y-6">
            {/* Status Messages */}
            {statusMessage && (
                <div
                    className={`p-4 rounded-2xl border text-xs font-semibold text-center flex items-center justify-center gap-2 transition-all duration-350 ${statusMessage.isError
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}
                >
                    {statusMessage.isError ? <ShieldAlert size={14} /> : <Zap size={14} />}
                    <span>{statusMessage.text}</span>
                </div>
            )}
            {/* Unified Tools & Testing Card */}
            <div className="bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 p-6 rounded-3xl space-y-6 shadow-sm">
                <div className="border-b border-[#1f293d]/40 pb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="text-indigo-400" size={16} />
                        <span>Tools & Testing</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">Simulate application usage and subscription timelines in real-time.</p>
                </div>
                {/* Sub-section 1: Usage Simulation */}
                <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 mt-0.5">
                            <FileDown size={14} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-200">Simulate Report Export</h4>
                            <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                                Increment report usage count. Checks feature availability and active plan limitations before processing.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleIncrementUsage}
                        disabled={isIncrementing || isTimeTraveling}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm shadow-indigo-600/15 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                        {isIncrementing ? 'Processing...' : 'Export Mock Report'}
                    </button>
                </div>
                <div className="border-t border-[#1f293d]/30 pt-4 space-y-4">
                    {/* Sub-section 2: Expiry & Time travel */}
                    <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 mt-0.5">
                            <Clock size={14} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-200">Subscription Expiry Simulation</h4>
                            <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                                Simulate subscription duration passing by fast-forwarding dates. Helps test access locks and feature limits.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleTimeTravel(7)}
                            disabled={isTimeTraveling || isIncrementing}
                            className="bg-[#121824] hover:bg-[#1f293d] border border-[#1f293d] text-slate-300 hover:text-white text-[11px] font-bold py-2 px-3 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                        >
                            +7 Days
                        </button>
                        <button
                            onClick={() => handleTimeTravel(30)}
                            disabled={isTimeTraveling || isIncrementing}
                            className="bg-[#121824] hover:bg-[#1f293d] border border-[#1f293d] text-slate-300 hover:text-white text-[11px] font-bold py-2 px-3 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center text-center"
                        >
                            +30 Days
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
