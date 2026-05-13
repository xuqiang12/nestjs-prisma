# NestJS Prisma 项目规则

## 代码风格

### 命名规范

- 变量/函数：`camelCase`（如 `userName`）
- 类/类型：`PascalCase`（如 `UserService`）
- 常量：`UPPER_SNAKE_CASE`（如 `MAX_COUNT`）
- 文件名：`kebab-case`（如 `user-service.ts`）

### 导入顺序

1. 外部包（如 `@nestjs/common`）
2. 内部模块（如 `src/modules/auth`）
3. 相对导入（如 `./dto`）

## 模块结构

每个模块遵循：

```
模块名/
├── dto/           # 数据传输对象
├── controller.ts  # 路由和请求处理
├── service.ts     # 业务逻辑
└── module.ts      # 模块定义
```

## 数据库规则

### Prisma

- 修改 `schema.prisma` 后必须运行迁移
- 查询时用 `select` 只选需要的字段
- 处理 null 值要显式判断

## 安全规则

- 密码必须用 `bcryptjs` 加密
- 所有用户输入必须验证
- 敏感接口要检查权限

## API 设计

- 资源名用复数（如 `/users`）
- 用合适的 HTTP 方法（GET查、POST增、PUT/PATCH改、DELETE删）
- 所有接口要加 Swagger 文档注释
