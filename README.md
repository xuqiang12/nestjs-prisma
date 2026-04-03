## Prisma 设置

mysql+prisma+nestjs
https://github.com/notiz-dev/nestjs-prisma-starter/blob/main/.env.example

### 1. 安装依赖

安装 [Nestjs CLI](https://docs.nestjs.com/cli/usages) 以启动和[生成 CRUD 资源](https://trilon.io/blog/introducing-cli-generators-crud-api-in-1-minute)

```bash
# npm
npm i -g @nestjs/cli
# yarn
yarn add -g @nestjs/cli
```

安装 Nest 应用的依赖：

```bash
# npm
npm install
# yarn
yarn install
```

使用 Nest CLI 快速生成

```bash
# 使用 Nest CLI 快速生成（推荐，自动注册模块）
nest g resource modules/user
```

启动 PostgreSQL 数据库

```bash
docker-compose -f docker-compose.db.yml up -d
# 或
npm run docker:db
```

### 6. 启动 NestJS 服务器

在开发模式下运行 Nest 服务器：

```bash
npm run start

# 监视模式
npm run start:dev
```

在生产模式下运行 Nest 服务器：

```bash
npm run start:prod
```

基本开发流程

1、在/prisma/schema.prisma 中定义数据库模型

```bash
# 更新数据库模型 开发环境使用
# prisma 模型同步到 MySQL 数据库里，真正创建 / 修改表
npx prisma db push

# 根据最新的 Prisma 模型，重新生成 TypeScript 类型文件。
npx prisma generate

# 更新失败时执行以下命令
# npx prisma generate --force
# npx prisma db push --force-reset
```

```bash
# 更新数据库模型 线上使用
# npx prisma migrate dev --name init      记一下  不知道干啥的
# prisma 模型（schema.prisma）同步到 MySQL 数据库里，真正创建 / 修改表。
npx prisma migrate dev --name 自定义名字

# 根据最新的 Prisma 模型，重新生成 TypeScript 类型文件。
npx prisma generate
```

2、使用 Nest CLI 快速生成模块

```bash
# 使用 Nest CLI 快速生成（推荐，自动注册模块）
nest g resource modules/user
```

3、在 DTO 中写校验规则
4、在 Service 写业务逻辑（注册 / 增删改查）
5、在 Controller 写接口
