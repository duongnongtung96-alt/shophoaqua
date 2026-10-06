import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  DB: D1Database
  BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Env }>()

// Cấu hình CORS để Frontend gọi được API
app.use('*', cors())

// 1. API lấy danh sách sản phẩm từ D1 Database
app.get('/api/products', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM products').all()
    return c.json({ success: true, data: results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 2. API lấy hình ảnh sản phẩm từ Cloudflare R2 Bucket
app.get('/api/images/:key', async (c) => {
  const key = c.req.param('key')
  const object = await c.env.BUCKET.get(key)
  
  if (!object) return c.text('Image Not Found', 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body, { headers })
})

export default app