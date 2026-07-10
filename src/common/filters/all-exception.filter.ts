// common/filters/all-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common'
import { Prisma } from '@prisma/client'

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest()
    const res = ctx.getResponse()
    // Prisma 错误
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logException(req, exception)
      if (exception.code === 'P2002') {
        return res.status(200).json({
          code: 400,
          message: '数据已存在',
          data: null,
        })
      }

      return this.serverError(res, exception)
    }

    // Http异常
    if (exception instanceof HttpException) {
      const resData = exception.getResponse()
      return res.status(200).json({
        code: exception.getStatus(),
        message: typeof resData === 'string' ? resData : resData['message'] || 'error',
        data: null,
      })
    }

    // 未知错误
    this.logException(req, exception)
    return this.serverError(res, exception)
  }

  private serverError(res: any, exception: any) {
    return res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: exception,
    })
  }

  private logException(req: any, exception: any) {
    const url = req?.originalUrl || req?.url || ''
    console.error(`[ERROR] ${req?.method || 'UNKNOWN'} ${url}`.trim())
    console.error(exception?.stack || exception)
  }
}
