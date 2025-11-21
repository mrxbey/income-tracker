import { NextRequest } from 'next/server'
import { db } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Require secret token for health check to prevent information disclosure
    const secret = req.headers.get('x-health-secret')
    if (secret !== process.env.HEALTH_CHECK_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check database connection
    await db.$queryRaw`SELECT 1`

    return Response.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
