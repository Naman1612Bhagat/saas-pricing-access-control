'use client'

import { useState, useEffect } from 'react'

export type Currency = 'INR' | 'USD'

const EVENT_NAME = 'currency-display-change'

export function useBillingRegion() {
    const [currency, setCurrencyState] = useState<Currency>('INR')

    useEffect(() => {
        // Read initially from localStorage on mount
        const saved = localStorage.getItem('currencyDisplay')
        if (saved === 'INR' || saved === 'USD') {
            setCurrencyState(saved)
        } else {
            // Check for backward compatibility with old billingRegion key
            const oldSaved = localStorage.getItem('billingRegion')
            if (oldSaved === 'india') {
                setCurrencyState('INR')
                localStorage.setItem('currencyDisplay', 'INR')
            } else if (oldSaved === 'international') {
                setCurrencyState('USD')
                localStorage.setItem('currencyDisplay', 'USD')
            }
        }
    }, [])

    useEffect(() => {
        const handleCustomEvent = (event: Event) => {
            const customEvent = event as CustomEvent<Currency>
            if (customEvent.detail === 'INR' || customEvent.detail === 'USD') {
                setCurrencyState(customEvent.detail)
            }
        }

        const handleStorageEvent = (event: StorageEvent) => {
            if (event.key === 'currencyDisplay' && (event.newValue === 'INR' || event.newValue === 'USD')) {
                setCurrencyState(event.newValue)
            }
        }

        window.addEventListener(EVENT_NAME, handleCustomEvent)
        window.addEventListener('storage', handleStorageEvent)

        return () => {
            window.removeEventListener(EVENT_NAME, handleCustomEvent)
            window.removeEventListener('storage', handleStorageEvent)
        }
    }, [])

    const setCurrency = (newCurrency: Currency) => {
        localStorage.setItem('currencyDisplay', newCurrency)
        setCurrencyState(newCurrency)
        
        // Dispatch custom event to notify other components/tabs
        const event = new CustomEvent<Currency>(EVENT_NAME, { detail: newCurrency })
        window.dispatchEvent(event)
    }

    return { currency, setCurrency }
}
