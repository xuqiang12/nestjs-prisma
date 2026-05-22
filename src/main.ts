import './common/utils/logger'

import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpAdapterHost, NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { PrismaClientExceptionFilter } from 'nestjs-prisma'
import { AppModule } from './app.module'
import type { CorsConfig, NestConfig, SwaggerConfig } from './common/configs/config.interface'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { AllExceptionFilter } from './common/filters/all-exception.filter'
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 关闭所有 Nest 自带的启动日志
    logger: false,
  })

  // Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      // 👇 关键！校验失败就立刻停止，不继续检查后面
      stopAtFirstError: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        // 取第一个错误的第一条消息
        const firstError = errors[0]
        const firstMessage = Object.values(firstError.constraints)[0]
        return new BadRequestException(firstMessage)
      },
    }),
  )

  // 开启服务关闭钩子
  app.enableShutdownHooks()

  //  数据库异常全局捕获
  const { httpAdapter } = app.get(HttpAdapterHost)
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter))

  const configService = app.get(ConfigService)
  const nestConfig = configService.get<NestConfig>('nest')
  const corsConfig = configService.get<CorsConfig>('cors')
  const swaggerConfig = configService.get<SwaggerConfig>('swagger')
  // 自动生成接口文档 Swagger Api
  if (swaggerConfig.enabled) {
    const options = new DocumentBuilder()
      .setTitle(swaggerConfig.title || 'Nestjs')
      .setDescription(swaggerConfig.description || 'The nestjs API description')
      .setVersion(swaggerConfig.version || '1.0')
      .build()
    const document = SwaggerModule.createDocument(app, options)

    SwaggerModule.setup(swaggerConfig.path || 'api', app, document)
  }

  // 开启跨域（CORS）
  if (corsConfig.enabled) {
    app.enableCors()
  }
  app.useGlobalInterceptors(new ResponseInterceptor())
  app.useGlobalFilters(new AllExceptionFilter())
  // 启动服务，监听端口
  await app.listen(process.env.PORT || nestConfig.port || 3000)
}
bootstrap()
