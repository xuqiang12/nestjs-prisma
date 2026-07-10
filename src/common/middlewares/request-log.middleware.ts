import { NextFunction, Request, Response } from 'express'

export function requestLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startedAt
    const url = req.originalUrl || req.url
    console.log(`[HTTP] ${req.method} ${url} ${res.statusCode} ${duration}ms`)
  })

  next()
}
