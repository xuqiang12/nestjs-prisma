// common/filters/all-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common'
import { Prisma } from '@prisma/client'

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse()

    // Prisma 错误
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return res.status(200).json({
          code: 400,
          message: '数据已存在',
          data: null,
        })
      }
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
    return res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
    })
  }
}
