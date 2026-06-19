'use server'

import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export async function loginUser(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { success: false, error: 'Email and password are required.' }
    }

    try {
        const res = await fetch(`${SERVER_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            cache: 'no-store',
        })

        const data = await res.json()

        if (!res.ok || !data.token) {
            return { success: false, error: data.errors?.[0]?.message || 'Invalid email or password.' }
        }

        const cookieStore = await cookies()
        cookieStore.set('payload-token', data.token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        })

        return { success: true }
    } catch (err: any) {
        console.error('Login action error:', err)
        return { success: false, error: 'An unexpected error occurred. Please try again.' }
    }
}

export async function registerUser(prevState: any, formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!name || !email || !password) {
        return { success: false, error: 'All fields are required.' }
    }

    try {
        const payloadConfig = await config
        const payload = await getPayload({ config: payloadConfig })

        await payload.create({
            collection: 'users',
            data: {
                name,
                email,
                password,
                role: 'user',
            },
        })

        const res = await fetch(`${SERVER_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            cache: 'no-store',
        })

        const data = await res.json()

        if (data.token) {
            const cookieStore = await cookies()
            cookieStore.set('payload-token', data.token, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
            })
        }

        return { success: true }
    } catch (err: any) {
        console.error('Registration action error:', err)
        return { success: false, error: err.message || 'Registration failed. User may already exist.' }
    }
}

import { headers as getHeaders } from 'next/headers'

export async function logoutUser() {
    const cookieStore = await cookies()
    cookieStore.delete('payload-token')
    return { success: true }
}

export async function subscribeToPlan(planId: string | number) {
    try {
        const headers = await getHeaders()
        const payloadConfig = await config
        const payload = await getPayload({ config: payloadConfig })

        const { user } = await payload.auth({ headers })
        if (!user) {
            return { success: false, error: 'You must be logged in to subscribe.' }
        }

        const plan = await payload.findByID({
            collection: 'plans',
            id: planId,
        })

        if (!plan) {
            return { success: false, error: 'Selected plan does not exist.' }
        }

        const existingSubscriptions = await payload.find({
            collection: 'subscriptions',
            where: {
                and: [
                    {
                        user: {
                            equals: user.id,
                        },
                    },
                    {
                        status: {
                            equals: 'active',
                        },
                    },
                ],
            },
        })

        for (const sub of existingSubscriptions.docs) {
            await payload.update({
                collection: 'subscriptions',
                id: sub.id,
                data: {
                    status: 'expired',
                },
            })
        }

        await payload.create({
            collection: 'subscriptions',
            data: {
                user: user.id,
                plan: plan.id,
                amountPaid: plan.price,
            },
        })

        return { success: true }
    } catch (err: any) {
        console.error('Subscription creation error:', err)
        return { success: false, error: err.message || 'Failed to process subscription.' }
    }
}

export async function simulateTimeTravel(subscriptionId: string | number, days: number) {
    try {
        const payloadConfig = await config
        const payload = await getPayload({ config: payloadConfig })

        const sub = await payload.findByID({
            collection: 'subscriptions',
            id: subscriptionId,
        })

        if (!sub) {
            return { success: false, error: 'Subscription not found.' }
        }

        const start = new Date(sub.startDate as string)
        const expiry = new Date(sub.expiryDate as string)

        start.setDate(start.getDate() - days)
        expiry.setDate(expiry.getDate() - days)

        await payload.update({
            collection: 'subscriptions',
            id: subscriptionId,
            data: {
                startDate: start.toISOString(),
                expiryDate: expiry.toISOString(),
            },
        })

        return { success: true }
    } catch (err: any) {
        console.error('Time travel action error:', err)
        return { success: false, error: err.message || 'Failed to shift dates.' }
    }
}

import { incrementFeatureUsage } from '@/utilities/subscriptionHelpers'

export async function incrementReportUsageAction() {
    try {
        const headers = await getHeaders()
        const payloadConfig = await config
        const payload = await getPayload({ config: payloadConfig })

        const { user } = await payload.auth({ headers })
        if (!user) {
            return { success: false, error: 'You must be logged in.' }
        }

        const success = await incrementFeatureUsage({
            payload,
            userId: String(user.id),
            featureKey: 'export-reports',
        })

        if (!success) {
            return { success: false, error: 'Failed to increment. You may have exceeded your limit or your subscription is inactive/expired.' }
        }

        return { success: true }
    } catch (err: any) {
        console.error('Increment report usage action error:', err)
        return { success: false, error: err.message || 'Error incrementing usage.' }
    }
}
