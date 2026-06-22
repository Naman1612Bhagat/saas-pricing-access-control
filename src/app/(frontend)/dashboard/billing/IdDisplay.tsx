'use client'

import { useState } from 'react'

interface IdDisplayProps {
    label: string
    value: string
}

export function IdDisplay({ label, value }: IdDisplayProps) {
    const [copied, setCopied] = useState(false)

    const shortenId = (id: string): string => {
        if (!id) return ''
        if (id.length <= 12) return id
        const firstChars = id.startsWith('cf_') ? 9 : 6
        const lastChars = 4
        if (id.length <= firstChars + lastChars + 2) return id
        return `${id.slice(0, firstChars)}...${id.slice(-lastChars)}`
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch (err) {
            console.error('Failed to copy: ', err)
        }
    }

    return (
        <div className="flex flex-col space-y-0.5">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                {label}
            </span>
            <div className="flex items-center space-x-1.5 text-xs font-mono">
                {/* Shortened ID with custom tooltip */}
                <div className="relative group inline-block">
                    <span className="cursor-help border-b border-dotted border-slate-600 text-slate-300 hover:text-white transition-colors duration-150">
                        {shortenId(value)}
                    </span>
                    {/* Tooltip Content */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-[#0f172a] border border-slate-800 text-slate-300 text-[11px] px-3 py-1.5 rounded-lg shadow-xl font-mono whitespace-nowrap z-50 pointer-events-none transition-all duration-200">
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Full ID</span>
                        <span>{value}</span>
                        {/* Tooltip Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0f172a]" />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 -z-10 translate-y-[1px]" />
                    </div>
                </div>
                {/* Copy Button */}
                <div className="relative flex items-center">
                    <button
                        onClick={handleCopy}
                        type="button"
                        className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-800/40 cursor-pointer"
                        title={`Copy ${label} ID`}
                    >
                        {copied ? (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        )}
                    </button>
                    {/* Copied Success Popover */}
                    {copied && (
                        <span className="absolute left-full ml-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-semibold rounded-md whitespace-nowrap">
                            Copied
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
