import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  DB: D1Database
  BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Env }>()
app.use('*', cors())

// Thêm route này
app.get('/', (c) => c.text('Fruitica Hono API running on Cloudflare Workers!'))

app.get('/api/products', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM products').all()
    return c.json({ success: true, data: results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default app