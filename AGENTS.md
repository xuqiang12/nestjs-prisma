# AGENTS.md - nestjs-prisma 项目规则

本文件是当前 `nestjs-prisma` 项目的协作与编码准则。所有任务必须优先遵守用户明确要求，其次遵守本文件规则。

## 项目技术栈

- NestJS 10
- TypeScript
- Prisma 5
- PostgreSQL
- pgvector
- `nestjs-prisma`
- `@nestjs/config`
- `@nestjs/jwt`
- `@nestjs/swagger`
- `class-validator` / `class-transformer`
- LangChain / OpenAI 兼容接口
- Jest / ts-jest / supertest

## 当前项目结构认知

- 应用入口：`src/main.ts`
- 根模块：`src/app.module.ts`
- 全局配置：`src/common/configs`
- 全局 Guard：`src/common/guards`
- 全局异常与响应封装：`src/common/filters`、`src/common/interceptors`
- 用户、认证、菜单、聊天模块：`src/modules`
- AI 调度核心：`src/ai-engine`
- 知识库业务模块：`src/modules/knowledge-bot`
- Prisma schema：`prisma/schema.prisma`
- Prisma seed：`prisma/seed.ts`、`prisma/seeds`
- e2e 测试：`test`

## 任务执行规则

1. 用户只要求“分析、看看、review、帮我看一下、判断方案”时，只允许阅读代码、配置、文档和测试，不修改业务代码，不执行会改变项目运行状态的命令。
2. 用户明确要求“修复、开发、实现、可以改、按方案处理、更新文件”后，才允许修改代码或文档。
3. 编码前必须先说明前提假设、执行步骤和验证标准；需求不清楚时先问，不擅自补业务含义。
4. 修改范围必须最小化，只改和本次需求直接相关的文件。
5. 不顺手重构、不格式化无关文件、不删除历史代码、不改变未确认的业务语义。
6. 发现无关问题时，只在结论里标注风险；除非用户确认，否则不一起修。
7. 所有新增或修改的中文文本、注释、文档必须保持 UTF-8 可读，不允许出现乱码。

## NestJS 编码规则

1. Controller 只负责路由、参数接收和调用 Service；业务逻辑放在 Service。
2. DTO 必须放在对应模块的 `dto` 目录，并使用 `class-validator` 描述入参规则。
3. 新增接口时必须确认路由、HTTP 方法、请求参数、返回结构和鉴权要求。
4. 不擅自新增全局中间件、全局 Guard、全局 Filter、全局 Interceptor。
5. 修改 `src/main.ts`、`src/app.module.ts`、全局 Guard、全局异常处理时，必须先说明影响范围。
6. 现有接口统一响应由 `ResponseInterceptor` 处理，不要在普通业务接口里重复包装 `{ code, message, data }`，除非当前代码路径已有明确约定。
7. 使用 `@Public()` 必须有明确理由；不得为了调试绕过认证。

## Prisma 与数据库规则

1. 运行期业务代码优先使用 `nestjs-prisma` 提供的 `PrismaService`，不要随意新增 `new PrismaClient()`。
2. 修改 `prisma/schema.prisma` 时，必须同步考虑 migration、seed、DTO、Service 查询和返回结构。
3. 不擅自执行会重置、迁移或写入数据库的命令，例如 `prisma migrate dev`、`prisma db push --force-reset`、`prisma migrate reset`、`prisma db seed`。
4. 涉及 `documents.embedding`、pgvector、原始 SQL、`$queryRaw`、`$executeRaw` 时，必须先确认向量维度、模型来源、SQL 注入风险和数据库扩展依赖。
5. Seed 脚本必须尽量幂等；新增初始化数据优先使用 `upsert` 或唯一约束配合 `skipDuplicates`。
6. 不提交真实账号、密码、手机号、API Key、数据库连接串等敏感信息。

## 认证与权限规则

1. 认证入口主要在 `src/modules/auth`，权限判断主要在 `src/common/guards`。
2. JWT payload 字段必须来自真实用户、角色和权限数据，不允许硬编码管理员身份。
3. 修改 `JwtAuthGuard`、`RolesGuard`、`PermissionsGuard` 前，必须追踪 token 生成、request.user 结构和装饰器读取逻辑。
4. `Role`、`Permission`、`Menu`、`MenuRole`、`MenuButton` 的关系必须以 `prisma/schema.prisma` 为准，不根据旧注释或旧代码猜测字段。
5. 菜单显示权限和按钮操作权限是两个不同概念；变更前必须确认使用 `MenuRole` 还是 `MenuButton -> Permission` 作为依据。
6. 权限码、角色名、菜单路径、组件路径不得擅自改名。

## AI 与知识库规则

1. 当前 AI 主线是 `src/ai-engine` 和 `src/modules/knowledge-bot`。
2. 旧实验 AI 目录已清理；不要在未确认业务契约时重新新增平行 AI 路径。
3. 修改 AI 路由、工具调用、RAG、向量检索前，必须先追踪当前模块是否已在 `AppModule` 注册。
4. LLM、Embedding、Chat API 相关环境变量必须通过 `.env.example` 或配置文档说明，不写死真实密钥。
5. 不擅自改变 prompt、路由分类、工具名称、返回结构；这些会影响上层调用契约。
6. 向量入库和检索涉及外部模型与数据库，测试时不要默认执行真实远程调用，除非用户明确允许。

## 环境变量规则

1. `.env` 可能包含本地敏感配置，不要输出或提交真实值。
2. `.env.example` 只能写变量名和示例占位值。
3. 新增配置项时，必须同步检查：
   - `src/common/configs/config.ts`
   - `src/common/configs/config.interface.ts`
   - `.env.example`
   - 实际读取配置的位置
4. 同一类配置优先统一通过 `ConfigService` 读取；不要在同一业务链路里混用多个配置来源，除非当前模块已有明确原因。

## 测试与验证规则

1. 代码修改后优先运行：
   - `npx.cmd tsc --noEmit`
2. 涉及 HTTP 控制器、全局启动或基础行为时，运行：
   - `npm.cmd run test:e2e -- --runInBand`
3. 涉及单元测试时，运行：
   - `npm.cmd test -- --runInBand`
4. 涉及 Prisma Client 生成、schema 或类型变化时，视情况运行：
   - `npm.cmd run prisma:generate`
5. 如果某条验证命令因为环境、数据库、网络或密钥缺失无法执行，必须在最终说明中明确写出未执行原因。

## 文档规则

1. 修改接口、认证、权限、数据库模型、AI 工具、环境变量时，必须同步考虑 README 或相关文档是否需要更新。
2. 当前项目没有稳定的 `doc/code` 业务文档体系；不要照搬其他项目的文档目录规则。
3. 分析类任务输出必须包含：
   - 问题分析
   - 实现方案或建议
   - 风险评估
   - 待确认事项
4. 开发类任务完成后必须说明：
   - 修改内容
   - 影响范围
   - 验证方式
   - 未验证项或剩余风险

## 禁止事项

1. 禁止把前端项目规则、Vue 规则、Element UI 规则套用到本项目。
2. 禁止擅自删除或重写 `prisma/migrations`。
3. 禁止擅自运行数据库重置、真实 seed、真实远程 AI 调用。
4. 禁止提交真实密钥、真实数据库地址、真实个人账号信息。
5. 禁止为了一次性逻辑新增复杂抽象。
6. 禁止为了测试方便绕过认证、权限或业务校验。
7. 禁止在未确认业务契约时新增默认值、兜底逻辑或兼容分支。
