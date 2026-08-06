// 注册应用根模块和全局基础模块。
import { Logger, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { PrismaModule, loggingMiddleware } from 'nestjs-prisma'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { UserModule } from './modules/user/user.module'
import { AuthModule } from './modules/auth/auth.module'
import config from './common/configs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { JwtModule } from '@nestjs/jwt'
import { MenuModule } from './modules/menu/menu.module'
import { AiRuntimeModule } from './ai-runtime/ai-runtime.module'
import { RoleModule } from './modules/role/role.module'
import { HomeModule } from './modules/home/home.module'
import { MobileTabBarModule } from './modules/mobile-tabbar/mobile-tabbar.module'
import { AiPlatformModule } from './modules/ai-platform/ai-platform.module'
import { AiConfigModule } from './modules/ai-config/ai-config.module'
import { KnowledgeModule } from './modules/knowledge/knowledge.module'
import { AgentChatModule } from './modules/agent-chat/agent-chat.module'
import { ChatModule } from './modules/chat/chat.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        middlewares: [
          // configure your prisma middleware
          loggingMiddleware({
            logger: new Logger('PrismaMiddleware'),
            logLevel: 'log',
          }),
        ],
      },
    }),
    UserModule,
    AuthModule,
    AiRuntimeModule,
    ChatModule,
    AgentChatModule,
    AiPlatformModule,
    AiConfigModule,
    KnowledgeModule,
    // JwtModule.register({
    //   secret: 'YOUR_SECRET_KEY_2025', // 密钥
    //   signOptions: { expiresIn: '7d' }, // 7天过期
    // }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: 'YOUR_SECRET_KEY_2025',
        signOptions: {
          expiresIn: '7d',
        },
      }),
      inject: [ConfigService],
      global: true, // 👈 关键！全局可用！
    }),
    MenuModule,
    RoleModule,
    HomeModule,
    MobileTabBarModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
