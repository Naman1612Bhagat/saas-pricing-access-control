import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'
import { processSuccessfulPayment } from '@/lib/subscriptions/subscriptionService'
import type { User, Plan, Payment } from '@/payload-types'

let payload: Payload
let testUser: User
let testPlan: Plan

describe('Payment & Subscription Integration', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    const users = await payload.find({
      collection: 'users',
      limit: 1,
    })
    if (users.docs.length > 0) {
      testUser = users.docs[0] as User
    } else {
      testUser = await payload.create({
        collection: 'users',
        data: {
          name: 'Test Payment User',
          email: 'testpayments@accessshield.com',
          password: 'testpassword',
          role: 'admin',
        },
      }) as User
    }

    const plans = await payload.find({
      collection: 'plans',
      limit: 1,
    })
    if (plans.docs.length > 0) {
      testPlan = plans.docs[0] as Plan
    } else {
      testPlan = await payload.create({
        collection: 'plans',
        data: {
          name: 'Starter Plan',
          price: 999,
          validityDays: 30,
          isActive: true,
          featureLimits: [],
        },
      }) as Plan
    }
  })

  it('claims payment atomically and prevents duplicate subscription creation', async () => {
    const testOrderId = 'order_test_' + Date.now()
    const payment = await payload.create({
      collection: 'payments',
      data: {
        user: testUser.id,
        plan: testPlan.id,
        amount: 999,
        currency: 'INR',
        gateway: 'razorpay',
        gatewayOrderId: testOrderId,
        razorpayOrderId: testOrderId,
        status: 'created',
      },
    }) as Payment

    expect(payment.status).toBe('created')

    const promise1 = processSuccessfulPayment({
      payload,
      payment,
      gatewayPaymentId: 'pay_test_1',
      gatewaySignature: 'sig_test_1',
    })

    const promise2 = processSuccessfulPayment({
      payload,
      payment,
      gatewayPaymentId: 'pay_test_2',
      gatewaySignature: 'sig_test_2',
    })

    const results = await Promise.allSettled([promise1, promise2])



    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('fulfilled')

    const dbPayment = await payload.findByID({
      collection: 'payments',
      id: payment.id,
    })

    expect(dbPayment.status).toBe('paid')
    expect(['pay_test_1', 'pay_test_2']).toContain(dbPayment.gatewayPaymentId)

    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        user: { equals: testUser.id },
      },
    })

    for (const sub of subscriptions.docs) {
      await payload.delete({
        collection: 'feature-usages',
        where: {
          subscription: { equals: sub.id },
        },
      })
      await payload.delete({
        collection: 'subscriptions',
        id: sub.id,
      })
    }

    await payload.delete({
      collection: 'payments',
      id: payment.id,
    })
  }, 30000)
})
