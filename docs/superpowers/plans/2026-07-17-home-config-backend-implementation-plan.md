# Home Config Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add backend storage and APIs for homepage configuration in the current `nestjs-prisma` project, using the project's existing NestJS, Prisma, response, and routing conventions.

**Architecture:** Create a focused `HomeModule` under `src/modules/home` that owns homepage configuration HTTP contracts, DTO validation, Prisma queries, and database-to-API shape conversion. Store shared component fields in `HomeComponent` columns and component-specific configuration in `info` JSON, preserving the `HomeDecoration -> HomeComponent[] -> info` business shape without introducing per-component business tables.

**Tech Stack:** NestJS 10, TypeScript, Prisma 5, PostgreSQL, `nestjs-prisma`, `@nestjs/swagger`, `class-validator`, Jest/e2e, and the existing global `ResponseInterceptor`.

---

## Confirmed Decisions

- Use current backend conventions, not the mini-program's old wrapper conventions.
- Do not add `/api`; this project currently has no global `/api` prefix.
- Public read APIs are allowed and must use `@Public()`.
- Do not add seed data in this phase.
- Prisma schema and migration changes are allowed.
- New read APIs use `GET`; new write, delete, status, and sort APIs use `POST`.
- Admin management APIs are included, but do not add `@Permissions(...)` in this phase because permission seed data is not being added now.
- Business handlers return raw business data and let `ResponseInterceptor` wrap it as `{ code, message, data }`.

## Scope And Non-Goals

This plan applies only to the backend project at `F:\公司项目\gitee\nestjs-prisma`.

In scope:

- Add `home_decoration` and `home_component` persistence through Prisma.
- Add public homepage read APIs.
- Add admin management APIs for decorations and components.
- Add DTO validation for scene, status, sort, template type, and JSON-compatible `info`.
- Add migration and update Swagger grouping.
- Verify by TypeScript compile and focused e2e/API tests where environment allows.

Out of scope:

- Mini-program UI changes.
- Admin frontend page changes.
- Seed data for homepage configuration, menus, buttons, or permissions.
- Product, brand, cart, activity popup, or other business modules.
- Per-component tables such as `home_advert`, `home_notice`, or `home_nav_single`.
- `PUT`, `PATCH`, or `DELETE` routes.

## Current Project Facts

- App module registration lives in `src/app.module.ts`.
- Global JSON response wrapping lives in `src/common/interceptors/response.interceptor.ts`.
- Global auth guard honors `@Public()` from `src/common/decorators/public.decorator.ts`.
- Swagger grouping is hand-built in `src/common/swagger/swagger-docs.ts`.
- Runtime Prisma access should use `PrismaService` from `nestjs-prisma`.
- Current route style is mixed historically, but new routes must follow the project rule: `GET` for reads and `POST` for writes.

## Target File Structure

Create:

```text
src/modules/home
├── dto
│   ├── component.dto.ts
│   ├── decoration.dto.ts
│   └── query.dto.ts
├── home.constants.ts
├── home.controller.ts
├── home.module.ts
└── home.service.ts
```

Modify:

```text
prisma/schema.prisma
prisma/migrations/20260717000000_add_home_config/migration.sql
src/app.module.ts
src/common/swagger/swagger-docs.ts
```

Verify:

```text
npm.cmd run prisma:generate
npx.cmd tsc --noEmit
npm.cmd run test:e2e -- --runInBand
```

## API Contract

Public read APIs:

```http
GET /home/config
GET /home/content-detail?id=home-recommend
```

Admin management APIs:

```http
GET  /home/decorations/list
GET  /home/decorations/detail?id=mock-home
POST /home/decorations/create
POST /home/decorations/update
POST /home/decorations/status

GET  /home/components/list?decorationId=mock-home
POST /home/components/create
POST /home/components/update
POST /home/components/status
POST /home/components/sort
```

Returned business data shape:

```ts
type HomeComponent = {
  id: string
  templateId: HomeTemplateId
  templateName?: string
  info: Record<string, any>
}

type HomeDecoration = {
  id: string
  name: string
  scene: 'homePage' | 'firstScreen' | 'content' | 'empty'
  components: HomeComponent[]
}
```

Actual HTTP response is produced by the global interceptor:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "mock-home",
    "name": "首页",
    "scene": "homePage",
    "components": []
  }
}
```

Missing content detail returns a successful empty decoration:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "missing-id",
    "name": "",
    "scene": "empty",
    "components": []
  }
}
```

## Constants

Create `src/modules/home/home.constants.ts`:

```ts
export const HOME_SCENES = ['homePage', 'firstScreen', 'content', 'empty'] as const

export const HOME_TEMPLATE_IDS = [
  'homePageTitle',
  'navSingle',
  'advert',
  'notice',
  'cube',
  'typeList',
  'divider',
  'search',
  'navLinkage',
] as const

export const HOME_STATUS = {
  disabled: 0,
  enabled: 1,
} as const

export type HomeScene = (typeof HOME_SCENES)[number]
export type HomeTemplateId = (typeof HOME_TEMPLATE_IDS)[number]
```

## Task 1: Add Prisma Models And Migration

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260717000000_add_home_config/migration.sql`

- [ ] **Step 1: Add Prisma models**

Add these models near other business models in `prisma/schema.prisma`:

```prisma
model HomeDecoration {
  id         String          @id @db.VarChar(64)
  name       String          @db.VarChar(100)
  scene      String          @db.VarChar(32)
  status     Int             @default(1)
  sortNo     Int             @default(0) @map("sort_no")
  remark     String?         @db.VarChar(255)
  components HomeComponent[]
  createdAt  DateTime        @default(now()) @map("created_at")
  updatedAt  DateTime        @updatedAt @map("updated_at")

  @@index([scene, status, sortNo])
  @@map("home_decoration")
}

model HomeComponent {
  id           String         @id @db.VarChar(64)
  decorationId String         @map("decoration_id") @db.VarChar(64)
  decoration   HomeDecoration @relation(fields: [decorationId], references: [id], onDelete: Cascade)
  templateId   String         @map("template_id") @db.VarChar(32)
  templateName String?        @map("template_name") @db.VarChar(100)
  info         Json
  sortNo       Int            @default(0) @map("sort_no")
  status       Int            @default(1)
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")

  @@index([decorationId, status, sortNo])
  @@map("home_component")
}
```

- [ ] **Step 2: Create migration SQL**

Create `prisma/migrations/20260717000000_add_home_config/migration.sql`:

```sql
CREATE TABLE "home_decoration" (
  "id" VARCHAR(64) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "scene" VARCHAR(32) NOT NULL,
  "status" INTEGER NOT NULL DEFAULT 1,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "remark" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "home_decoration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "home_component" (
  "id" VARCHAR(64) NOT NULL,
  "decoration_id" VARCHAR(64) NOT NULL,
  "template_id" VARCHAR(32) NOT NULL,
  "template_name" VARCHAR(100),
  "info" JSONB NOT NULL,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "home_component_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "home_decoration_scene_status_sort_no_idx" ON "home_decoration"("scene", "status", "sort_no");
CREATE INDEX "home_component_decoration_id_status_sort_no_idx" ON "home_component"("decoration_id", "status", "sort_no");

ALTER TABLE "home_component"
ADD CONSTRAINT "home_component_decoration_id_fkey"
FOREIGN KEY ("decoration_id") REFERENCES "home_decoration"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Generate Prisma Client**

Run:

```powershell
npm.cmd run prisma:generate
```

Expected:

```text
Generated Prisma Client
```

- [ ] **Step 4: Verify TypeScript sees the models**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

## Task 2: Add DTOs And Constants

**Files:**

- Create: `src/modules/home/home.constants.ts`
- Create: `src/modules/home/dto/query.dto.ts`
- Create: `src/modules/home/dto/decoration.dto.ts`
- Create: `src/modules/home/dto/component.dto.ts`

- [ ] **Step 1: Create query DTOs**

Create `src/modules/home/dto/query.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class HomeContentDetailQueryDto {
  @ApiProperty({ description: '首页配置或频道内容 ID' })
  @IsString()
  id: string
}

export class HomeDecorationDetailQueryDto {
  @ApiProperty({ description: '首页配置 ID' })
  @IsString()
  id: string
}

export class HomeDecorationListQueryDto {
  @ApiPropertyOptional({ description: '场景类型' })
  @IsString()
  @IsOptional()
  scene?: string
}

export class HomeComponentListQueryDto {
  @ApiProperty({ description: '所属首页配置 ID' })
  @IsString()
  decorationId: string
}
```

- [ ] **Step 2: Create decoration DTOs**

Create `src/modules/home/dto/decoration.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { HOME_SCENES } from '../home.constants'

export class CreateHomeDecorationDto {
  @ApiProperty({ description: '配置 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '配置名称' })
  @IsString()
  name: string

  @ApiProperty({ description: '场景类型', enum: HOME_SCENES })
  @IsIn(HOME_SCENES)
  scene: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用', default: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsInt()
  @IsOptional()
  sortNo?: number

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  remark?: string
}

export class UpdateHomeDecorationDto extends PartialType(CreateHomeDecorationDto) {
  @ApiProperty({ description: '配置 ID' })
  @IsString()
  id: string
}

export class UpdateHomeDecorationStatusDto {
  @ApiProperty({ description: '配置 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 停用' })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}
```

- [ ] **Step 3: Create component DTOs**

Create `src/modules/home/dto/component.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateNested, IsArray } from 'class-validator'
import { Type } from 'class-transformer'
import { HOME_TEMPLATE_IDS } from '../home.constants'

export class CreateHomeComponentDto {
  @ApiProperty({ description: '组件 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '所属配置 ID' })
  @IsString()
  decorationId: string

  @ApiProperty({ description: '组件类型', enum: HOME_TEMPLATE_IDS })
  @IsIn(HOME_TEMPLATE_IDS)
  templateId: string

  @ApiPropertyOptional({ description: '组件名称' })
  @IsString()
  @IsOptional()
  templateName?: string

  @ApiProperty({ description: '组件差异化 JSON 配置' })
  @IsObject()
  info: Record<string, unknown>

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsInt()
  @IsOptional()
  sortNo?: number

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用', default: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class UpdateHomeComponentDto extends PartialType(CreateHomeComponentDto) {
  @ApiProperty({ description: '组件 ID' })
  @IsString()
  id: string
}

export class UpdateHomeComponentStatusDto {
  @ApiProperty({ description: '组件 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 停用' })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}

export class HomeComponentSortItemDto {
  @ApiProperty({ description: '组件 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '排序' })
  @IsInt()
  sortNo: number
}

export class SortHomeComponentsDto {
  @ApiProperty({ description: '所属配置 ID' })
  @IsString()
  decorationId: string

  @ApiProperty({ type: [HomeComponentSortItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeComponentSortItemDto)
  items: HomeComponentSortItemDto[]
}
```

- [ ] **Step 4: Verify DTO compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

## Task 3: Add Home Service

**Files:**

- Create: `src/modules/home/home.service.ts`

- [ ] **Step 1: Implement read and admin service methods**

Create `src/modules/home/home.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { HOME_STATUS } from './home.constants'
import { CreateHomeComponentDto, SortHomeComponentsDto, UpdateHomeComponentDto, UpdateHomeComponentStatusDto } from './dto/component.dto'
import { CreateHomeDecorationDto, UpdateHomeDecorationDto, UpdateHomeDecorationStatusDto } from './dto/decoration.dto'
import { HomeDecorationListQueryDto } from './dto/query.dto'

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeConfig() {
    const decoration = await this.prisma.homeDecoration.findFirst({
      where: { scene: 'homePage', status: HOME_STATUS.enabled },
      include: this.enabledComponentsInclude(),
      orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
    })

    return decoration ? this.toHomeDecoration(decoration) : this.emptyDecoration('mock-home')
  }

  async getContentDetail(id: string) {
    const decoration = await this.prisma.homeDecoration.findFirst({
      where: { id, status: HOME_STATUS.enabled },
      include: this.enabledComponentsInclude(),
    })

    return decoration ? this.toHomeDecoration(decoration) : this.emptyDecoration(id)
  }

  async listDecorations(query: HomeDecorationListQueryDto) {
    return this.prisma.homeDecoration.findMany({
      where: query.scene ? { scene: query.scene } : undefined,
      orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
    })
  }

  async getDecorationDetail(id: string) {
    const decoration = await this.prisma.homeDecoration.findUnique({
      where: { id },
      include: {
        components: {
          orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
        },
      },
    })
    if (!decoration) {
      throw new NotFoundException('首页配置不存在')
    }
    return decoration
  }

  async createDecoration(dto: CreateHomeDecorationDto) {
    await this.prisma.homeDecoration.create({
      data: {
        id: dto.id,
        name: dto.name,
        scene: dto.scene,
        status: dto.status ?? HOME_STATUS.enabled,
        sortNo: dto.sortNo ?? 0,
        remark: dto.remark,
      },
    })
    return '首页配置新增成功'
  }

  async updateDecoration(dto: UpdateHomeDecorationDto) {
    const { id, ...data } = dto
    await this.ensureDecoration(id)
    await this.prisma.homeDecoration.update({ where: { id }, data })
    return '首页配置修改成功'
  }

  async updateDecorationStatus(dto: UpdateHomeDecorationStatusDto) {
    await this.ensureDecoration(dto.id)
    await this.prisma.homeDecoration.update({
      where: { id: dto.id },
      data: { status: dto.status },
    })
    return '首页配置状态修改成功'
  }

  async listComponents(decorationId: string) {
    await this.ensureDecoration(decorationId)
    return this.prisma.homeComponent.findMany({
      where: { decorationId },
      orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
    })
  }

  async createComponent(dto: CreateHomeComponentDto) {
    await this.ensureDecoration(dto.decorationId)
    await this.prisma.homeComponent.create({
      data: {
        id: dto.id,
        decorationId: dto.decorationId,
        templateId: dto.templateId,
        templateName: dto.templateName,
        info: dto.info,
        sortNo: dto.sortNo ?? 0,
        status: dto.status ?? HOME_STATUS.enabled,
      },
    })
    return '首页组件新增成功'
  }

  async updateComponent(dto: UpdateHomeComponentDto) {
    const { id, ...data } = dto
    await this.ensureComponent(id)
    if (data.decorationId) {
      await this.ensureDecoration(data.decorationId)
    }
    await this.prisma.homeComponent.update({ where: { id }, data })
    return '首页组件修改成功'
  }

  async updateComponentStatus(dto: UpdateHomeComponentStatusDto) {
    await this.ensureComponent(dto.id)
    await this.prisma.homeComponent.update({
      where: { id: dto.id },
      data: { status: dto.status },
    })
    return '首页组件状态修改成功'
  }

  async sortComponents(dto: SortHomeComponentsDto) {
    await this.ensureDecoration(dto.decorationId)
    const count = await this.prisma.homeComponent.count({
      where: {
        decorationId: dto.decorationId,
        id: { in: dto.items.map((item) => item.id) },
      },
    })
    if (count !== dto.items.length) {
      throw new BadRequestException('存在不属于当前配置的组件')
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.homeComponent.update({
          where: { id: item.id },
          data: { sortNo: item.sortNo },
        }),
      ),
    )
    return '首页组件排序修改成功'
  }

  private enabledComponentsInclude() {
    return {
      components: {
        where: { status: HOME_STATUS.enabled },
        orderBy: [{ sortNo: 'asc' as const }, { id: 'asc' as const }],
      },
    }
  }

  private toHomeDecoration(decoration: any) {
    return {
      id: decoration.id,
      name: decoration.name,
      scene: decoration.scene,
      components: decoration.components.map((component) => ({
        id: component.id,
        templateId: component.templateId,
        templateName: component.templateName,
        info: component.info,
      })),
    }
  }

  private emptyDecoration(id: string) {
    return {
      id,
      name: '',
      scene: 'empty',
      components: [],
    }
  }

  private async ensureDecoration(id: string) {
    const decoration = await this.prisma.homeDecoration.findUnique({ where: { id } })
    if (!decoration) {
      throw new NotFoundException('首页配置不存在')
    }
    return decoration
  }

  private async ensureComponent(id: string) {
    const component = await this.prisma.homeComponent.findUnique({ where: { id } })
    if (!component) {
      throw new NotFoundException('首页组件不存在')
    }
    return component
  }
}
```

- [ ] **Step 2: Tighten TypeScript if needed**

If `any` in `toHomeDecoration` is rejected by local lint expectations, replace it with Prisma payload types after `npm.cmd run prisma:generate` has produced the new client types.

- [ ] **Step 3: Verify compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

## Task 4: Add Controller And Module

**Files:**

- Create: `src/modules/home/home.controller.ts`
- Create: `src/modules/home/home.module.ts`
- Modify: `src/app.module.ts`
- Modify: `src/common/swagger/swagger-docs.ts`

- [ ] **Step 1: Create controller**

Create `src/modules/home/home.controller.ts`:

```ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { HomeService } from './home.service'
import { CreateHomeComponentDto, SortHomeComponentsDto, UpdateHomeComponentDto, UpdateHomeComponentStatusDto } from './dto/component.dto'
import { CreateHomeDecorationDto, UpdateHomeDecorationDto, UpdateHomeDecorationStatusDto } from './dto/decoration.dto'
import { HomeComponentListQueryDto, HomeContentDetailQueryDto, HomeDecorationDetailQueryDto, HomeDecorationListQueryDto } from './dto/query.dto'

@ApiTags('首页配置模块')
@ApiBearerAuth()
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Public()
  @ApiOperation({ summary: '获取首页主配置' })
  @Get('config')
  getHomeConfig() {
    return this.homeService.getHomeConfig()
  }

  @Public()
  @ApiOperation({ summary: '获取频道或联动内容详情' })
  @Get('content-detail')
  getContentDetail(@Query() query: HomeContentDetailQueryDto) {
    return this.homeService.getContentDetail(query.id)
  }

  @ApiOperation({ summary: '查询首页配置列表' })
  @Get('decorations/list')
  listDecorations(@Query() query: HomeDecorationListQueryDto) {
    return this.homeService.listDecorations(query)
  }

  @ApiOperation({ summary: '查询首页配置详情' })
  @Get('decorations/detail')
  getDecorationDetail(@Query() query: HomeDecorationDetailQueryDto) {
    return this.homeService.getDecorationDetail(query.id)
  }

  @ApiOperation({ summary: '新增首页配置' })
  @Post('decorations/create')
  createDecoration(@Body() dto: CreateHomeDecorationDto) {
    return this.homeService.createDecoration(dto)
  }

  @ApiOperation({ summary: '修改首页配置' })
  @Post('decorations/update')
  updateDecoration(@Body() dto: UpdateHomeDecorationDto) {
    return this.homeService.updateDecoration(dto)
  }

  @ApiOperation({ summary: '修改首页配置状态' })
  @Post('decorations/status')
  updateDecorationStatus(@Body() dto: UpdateHomeDecorationStatusDto) {
    return this.homeService.updateDecorationStatus(dto)
  }

  @ApiOperation({ summary: '查询首页组件列表' })
  @Get('components/list')
  listComponents(@Query() query: HomeComponentListQueryDto) {
    return this.homeService.listComponents(query.decorationId)
  }

  @ApiOperation({ summary: '新增首页组件' })
  @Post('components/create')
  createComponent(@Body() dto: CreateHomeComponentDto) {
    return this.homeService.createComponent(dto)
  }

  @ApiOperation({ summary: '修改首页组件' })
  @Post('components/update')
  updateComponent(@Body() dto: UpdateHomeComponentDto) {
    return this.homeService.updateComponent(dto)
  }

  @ApiOperation({ summary: '修改首页组件状态' })
  @Post('components/status')
  updateComponentStatus(@Body() dto: UpdateHomeComponentStatusDto) {
    return this.homeService.updateComponentStatus(dto)
  }

  @ApiOperation({ summary: '调整首页组件排序' })
  @Post('components/sort')
  sortComponents(@Body() dto: SortHomeComponentsDto) {
    return this.homeService.sortComponents(dto)
  }
}
```

- [ ] **Step 2: Create module**

Create `src/modules/home/home.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { HomeController } from './home.controller'
import { HomeService } from './home.service'

@Module({
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
```

- [ ] **Step 3: Register module**

Modify `src/app.module.ts`:

```ts
import { HomeModule } from './modules/home/home.module'
```

Add `HomeModule` to the `imports` array:

```ts
HomeModule,
```

- [ ] **Step 4: Register Swagger group**

Modify `src/common/swagger/swagger-docs.ts`:

```ts
import { HomeModule } from '../../modules/home/home.module'
```

Add `HomeModule` to the authorization/business-facing group used by admin modules:

```ts
{ name: '授权模块', url: '/api-docs/authorization-json', modules: [AuthModule, UserModule, MenuModule, RoleModule, HomeModule] },
```

- [ ] **Step 5: Verify compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

## Task 5: Add Focused E2E Coverage

**Files:**

- Create: `test/home.e2e-spec.ts`

- [ ] **Step 1: Add e2e tests for route and response behavior**

Create `test/home.e2e-spec.ts` with tests that use the real app and a test database only when the environment is available:

```ts
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from 'nestjs-prisma'

describe('HomeController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    prisma = app.get(PrismaService)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await prisma.homeComponent.deleteMany()
    await prisma.homeDecoration.deleteMany()
  })

  it('returns empty content detail for missing id without authentication', async () => {
    await request(app.getHttpServer())
      .get('/home/content-detail')
      .query({ id: 'missing-id' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0)
        expect(body.message).toBe('success')
        expect(body.data).toEqual({
          id: 'missing-id',
          name: '',
          scene: 'empty',
          components: [],
        })
      })
  })

  it('returns enabled homepage components in sort order without authentication', async () => {
    await prisma.homeDecoration.create({
      data: {
        id: 'mock-home',
        name: '首页',
        scene: 'homePage',
        components: {
          create: [
            {
              id: 'nav-single',
              templateId: 'navSingle',
              templateName: '一级导航',
              info: { list: [] },
              sortNo: 20,
            },
            {
              id: 'home-title',
              templateId: 'homePageTitle',
              templateName: '首页头部',
              info: { locationText: '全国' },
              sortNo: 10,
            },
            {
              id: 'disabled-component',
              templateId: 'advert',
              templateName: '停用轮播',
              info: { list: [] },
              sortNo: 5,
              status: 0,
            },
          ],
        },
      },
    })

    await request(app.getHttpServer())
      .get('/home/config')
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0)
        expect(body.data.id).toBe('mock-home')
        expect(body.data.components.map((item) => item.id)).toEqual(['home-title', 'nav-single'])
        expect(body.data.components[0]).toMatchObject({
          templateId: 'homePageTitle',
          templateName: '首页头部',
          info: { locationText: '全国' },
        })
      })
  })
})
```

- [ ] **Step 2: Run focused e2e tests**

Run:

```powershell
npm.cmd run test:e2e -- --runInBand home.e2e-spec.ts
```

Expected: tests pass when the test database has the new migration applied.

- [ ] **Step 3: Record environment blockers**

If the command fails because the local database is not available or the migration has not been deployed, record the exact blocker in the implementation summary and still run compile verification.

## Task 6: Final Verification

**Files:**

- No new files unless a previous task found a compile or API contract issue.

- [ ] **Step 1: Generate Prisma Client**

Run:

```powershell
npm.cmd run prisma:generate
```

Expected: command exits with code `0`.

- [ ] **Step 2: TypeScript compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

- [ ] **Step 3: E2E verification**

Run:

```powershell
npm.cmd run test:e2e -- --runInBand
```

Expected: command exits with code `0` when the database is available and migrated.

- [ ] **Step 4: Diff hygiene**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

## Acceptance Criteria

- `GET /home/config` is public and returns the enabled `homePage` decoration if it exists.
- `GET /home/content-detail?id=xxx` is public and returns an empty `HomeDecoration` when the id is missing.
- Public read APIs do not require JWT.
- The response wrapper stays `{ code, message, data }`.
- Components returned to consumers use `templateId` and `templateName`, not database column names.
- Disabled decorations and disabled components do not appear in public read responses.
- Admin management APIs use only `GET` and `POST`.
- Admin management APIs do not use `@Permissions(...)` in this phase.
- No seed files are added or modified for homepage data in this phase.
- Prisma models and migration exist for `home_decoration` and `home_component`.
- `npx.cmd tsc --noEmit` passes after Prisma Client generation.

## Follow-Up Work

- Add homepage configuration seed data after the real initial data contract is confirmed.
- Add menu, button, and permission seed data when the admin frontend route and permission design are confirmed.
- Add `@Permissions(...)` decorators to admin management APIs after permission seed data exists.
- Add admin frontend pages for list, edit, component form, status, and sort behavior in the frontend project.
