export function formatCurrency(amount: number, currency: string): string {
    const code = (currency || 'INR').toUpperCase()
    if (code === 'USD') {
        return `$${amount.toFixed(2)}`
    }
    // Fallback to INR
    const formattedAmount = Number(amount) % 1 === 0 ? amount.toString() : amount.toFixed(2)
    return `₹${formattedAmount}`
}
