## Prisma 设置

mysql+prisma+nestjs
https://github.com/notiz-dev/nestjs-prisma-starter/blob/main/.env.example

### 1. 安装依赖

安装 [Nestjs CLI](https://docs.nestjs.com/cli/usages) 以启动和[生成 CRUD 资源](https://trilon.io/blog/introducing-cli-generators-crud-api-in-1-minute)

```bash
# npm
npm i -g @nestjs/cli

npm install
```

### 启动 NestJS 服务器

```bash
# 在开发模式下运行 Nest 服务器：
npm run start

# 监视模式
npm run start:dev

# 在生产模式下运行 Nest 服务器：
npm run start:prod
```

基本开发流程

### 数据库表同步

```bash
# 在/prisma/schema.prisma 中定义数据库模型

# 首次同步数据库使用
npx prisma migrate dev --name init

# 线上环境使用 更新数据库模型 自定义名字（"update_$(Get-Date -Format 'yyyyMMddHHmmss')"）
npx prisma migrate dev --name "update_$(Get-Date -Format 'yyyyMMddHHmmss')"

# 开发环境 同步数据库表
npx prisma db push

# 强制重置数据库（删除所有数据）（仅在开发环境使用，线上环境请谨慎）
npx prisma db push --force-reset
```

### 数据库模型同步

```bash
# 根据最新的 Prisma 模型，重新生成 TypeScript 类型文件。
npx prisma generate
# 强制重新生成类型文件（更新失败时执行）
npx prisma generate --force
```

### 执行 seed 脚本 给数据库初始化数据

```bash
# 执行seed脚本 给数据库初始化数据
npx prisma db seed
```

### 使用 Nest CLI 快速生成模块

```bash
# 使用 Nest CLI 快速生成（推荐，自动注册模块）
nest g resource modules/user
```

### 在 DTO 中写校验规则

### 在 Service 写业务逻辑（注册 / 增删改查）

### 在 Controller 写接口

### 启动 PostgreSQL 数据库

```bash
docker-compose -f docker-compose.db.yml up -d
# 或
npm run docker:db
```

<!-- docker创建mysql数据库 -->
<!-- docker run -d --name blog-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 -e MYSQL_DATABASE=blog_db --restart=always mysql:8.0 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci -->
<!-- docker创建postgresql数据库 -->
<!-- docker run -d --name blog-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=123456 -e POSTGRES_DB=blog_db --restart=always postgres:15 -->
<!-- docker创建postgresql向量数据库 持久化数据 -->
<!-- docker run -d --name blog-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=123456 -e POSTGRES_DB=blog_db -v pg_data:/var/lib/postgresql/data --restart=always pgvector/pgvector:pg15 -->

<!-- 连接数据库 -->
<!-- docker exec -it blog-postgres psql -U postgres -d blog_db -->
<!-- 创建向量扩展 -->
<!-- CREATE EXTENSION IF NOT EXISTS vector; -->
<!-- 查看向量扩展是否安装成功 -->
<!-- \dx vector -->
<!-- 退出数据库 -->
<!-- \q -->
<!-- 查看数据库所有表 -->
<!-- \dt -->

## 创建 SQL索引

```sql
-- 创建一个索引，名字叫：documents_embedding_idx
CREATE INDEX documents_embedding_idx
-- 该索引作用于：documents 表
ON documents
-- 使用 pgvector 提供的 IVF_FLAT 索引  将数据分桶（clustering）、查询时只搜索部分桶、提高查询速度
USING ivfflat (embedding vector_cosine_ops)
-- 将数据分成 100 个桶（clusters）
WITH (lists = 100);
```