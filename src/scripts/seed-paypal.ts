import { getPayload } from 'payload'
import config from '../payload.config'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

async function run() {
    console.log('Initializing Payload...')
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })
    
    console.log('Checking for existing PayPal settings...')
    const existing = await payload.find({
        collection: 'payment-gateway-settings',
        where: {
            gateway: { equals: 'paypal' }
        }
    })
    
    if (existing.docs.length === 0) {
        console.log('Inserting PayPal settings...')
        await payload.create({
            collection: 'payment-gateway-settings',
            data: {
                gateway: 'paypal',
                displayName: 'PayPal',
                isEnabled: true,
                isTestMode: true,
                sortOrder: 3,
                description: 'Pay internationally using PayPal.',
            }
        })
        console.log('Seeded PayPal gateway settings successfully!')
    } else {
        console.log('PayPal gateway settings already exists.')
    }
    process.exit(0)
}

run().catch(err => {
    console.error('Failed to seed:', err)
    process.exit(1)
})
