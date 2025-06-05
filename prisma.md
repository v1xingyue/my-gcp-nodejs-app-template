# Prisma 使用流程完整指南

## 概述

Prisma 是一个现代化的 Node.js 和 TypeScript ORM（对象关系映射），它提供了类型安全的数据库访问、自动生成的查询构建器和强大的迁移工具。

## 1. 项目初始化和基础配置

### 1.1 安装 Prisma

```bash
# 安装 Prisma CLI（开发依赖）
npm install prisma --save-dev
# 或使用 pnpm
pnpm add -D prisma

# 安装 Prisma Client（生产依赖）
npm install @prisma/client
# 或使用 pnpm
pnpm add @prisma/client
```

### 1.2 初始化 Prisma

```bash
# 初始化 Prisma 项目
npx prisma init
```

这将创建：
- `prisma/schema.prisma` - Prisma 模式文件
- `.env` - 环境变量文件（包含数据库连接字符串）

### 1.3 配置数据库连接

在 `.env` 文件中配置数据库连接：

```env
# PostgreSQL 示例
DATABASE_URL="postgresql://username:password@localhost:5432/mydb?schema=public"

# MySQL 示例
DATABASE_URL="mysql://username:password@localhost:3306/mydb"

# SQLite 示例
DATABASE_URL="file:./dev.db"
```

## 2. 数据模型设计

### 2.1 编写 Prisma Schema

在 `prisma/schema.prisma` 中定义数据模型：

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  profile   Profile?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  userId Int    @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  tags      Tag[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("posts")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]

  @@map("tags")
}
```

### 2.2 常用字段类型和修饰符

```prisma
model Example {
  id          Int       @id @default(autoincrement())
  uuid        String    @id @default(uuid())
  email       String    @unique
  optional    String?   // 可选字段
  defaultStr  String    @default("default value")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  isActive    Boolean   @default(true)
  price       Decimal   @db.Decimal(10, 2)
  jsonData    Json
  
  // 索引
  @@index([email])
  @@unique([field1, field2])
  @@map("custom_table_name")
}
```

## 3. 数据库迁移

### 3.1 创建和应用迁移

```bash
# 生成迁移文件（开发环境）
npx prisma migrate dev --name init

# 应用迁移到生产环境
npx prisma migrate deploy

# 重置数据库（开发环境，会删除所有数据）
npx prisma migrate reset
```

### 3.2 迁移管理

```bash
# 查看迁移状态
npx prisma migrate status

# 生成迁移但不应用
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > migration.sql

# 标记迁移为已应用（不实际运行）
npx prisma migrate resolve --applied "20231201000000_migration_name"
```

## 4. 生成 Prisma Client

### 4.1 生成客户端

```bash
# 生成 Prisma Client
npx prisma generate
```

通常在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "ts-node prisma/seed.ts"
  }
}
```

### 4.2 使用 Prisma Client

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 创建用户
async function createUser() {
  const user = await prisma.user.create({
    data: {
      name: 'Alice',
      email: 'alice@example.com',
      posts: {
        create: [
          {
            title: 'Hello World',
            content: 'This is my first post',
            published: true
          }
        ]
      }
    },
    include: {
      posts: true
    }
  })
  return user
}

// 查询用户
async function getUsers() {
  const users = await prisma.user.findMany({
    include: {
      posts: {
        where: {
          published: true
        }
      },
      profile: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  return users
}

// 更新用户
async function updateUser(id: number, data: any) {
  const user = await prisma.user.update({
    where: { id },
    data,
    include: {
      posts: true
    }
  })
  return user
}

// 删除用户
async function deleteUser(id: number) {
  await prisma.user.delete({
    where: { id }
  })
}

// 事务操作
async function transferPost(postId: number, newAuthorId: number) {
  await prisma.$transaction([
    prisma.post.update({
      where: { id: postId },
      data: { authorId: newAuthorId }
    }),
    prisma.user.update({
      where: { id: newAuthorId },
      data: { updatedAt: new Date() }
    })
  ])
}

// 原始 SQL 查询
async function rawQuery() {
  const result = await prisma.$queryRaw`
    SELECT * FROM users WHERE email LIKE ${`%@example.com`}
  `
  return result
}

// 关闭连接
async function disconnect() {
  await prisma.$disconnect()
}
```

## 5. 数据库种子（Seeding）

### 5.1 创建种子文件

创建 `prisma/seed.ts`：

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 创建用户
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      posts: {
        create: [
          {
            title: 'Hello World',
            content: 'This is my first post',
            published: true
          },
          {
            title: 'Draft Post',
            content: 'This is a draft',
            published: false
          }
        ]
      }
    }
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob',
      posts: {
        create: [
          {
            title: 'Bob\'s Post',
            content: 'Hello from Bob',
            published: true
          }
        ]
      }
    }
  })

  console.log({ alice, bob })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
```

### 5.2 在 package.json 中配置

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

运行种子：

```bash
npx prisma db seed
```

## 6. 开发环境最佳实践

### 6.1 开发工作流

1. **修改 Schema** → `prisma/schema.prisma`
2. **生成迁移** → `npx prisma migrate dev --name describe_changes`
3. **生成客户端** → `npx prisma generate`（通常自动执行）
4. **更新应用代码** → 使用新的类型和方法

### 6.2 数据库浏览器

```bash
# 启动 Prisma Studio
npx prisma studio
```

在浏览器中查看和编辑数据：`http://localhost:5555`

### 6.3 环境配置

创建不同环境的配置文件：

`.env.development`：
```env
DATABASE_URL="postgresql://dev_user:dev_pass@localhost:5432/myapp_dev"
```

`.env.test`：
```env
DATABASE_URL="postgresql://test_user:test_pass@localhost:5432/myapp_test"
```

`.env.production`：
```env
DATABASE_URL="postgresql://prod_user:prod_pass@prod-host:5432/myapp_prod"
```

## 7. 测试环境配置

### 7.1 测试数据库设置

```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

beforeAll(async () => {
  // 应用迁移到测试数据库
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
  })
})

beforeEach(async () => {
  // 清理测试数据
  const tableNames = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `
  
  for (const { tablename } of tableNames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`)
    }
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

### 7.2 测试示例

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('User Model', () => {
  test('should create user', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com'
      }
    })

    expect(user.id).toBeDefined()
    expect(user.name).toBe('Test User')
    expect(user.email).toBe('test@example.com')
  })

  test('should find user by email', async () => {
    await prisma.user.create({
      data: {
        name: 'Alice',
        email: 'alice@example.com'
      }
    })

    const user = await prisma.user.findUnique({
      where: { email: 'alice@example.com' }
    })

    expect(user).toBeTruthy()
    expect(user?.name).toBe('Alice')
  })
})
```

## 8. 线上部署流程

### 8.1 部署前准备

1. **环境变量配置**：
```bash
# 生产环境变量
DATABASE_URL="postgresql://prod_user:prod_pass@prod-host:5432/myapp_prod"
SHADOW_DATABASE_URL="postgresql://prod_user:prod_pass@prod-host:5432/myapp_shadow" # 用于迁移预览
```

2. **构建脚本配置**：
```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "postinstall": "prisma generate",
    "deploy": "prisma migrate deploy && npm run build"
  }
}
```

### 8.2 Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production

# 生成 Prisma Client
RUN npx prisma generate

# 复制应用代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

`docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 8.3 CI/CD 流程

GitHub Actions 示例 (`.github/workflows/deploy.yml`)：

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # 部署到生产环境的脚本
          echo "Deploying to production..."
```

### 8.4 生产环境迁移

```bash
# 1. 备份生产数据库
pg_dump $PRODUCTION_DATABASE_URL > backup.sql

# 2. 检查迁移状态
npx prisma migrate status

# 3. 应用迁移
npx prisma migrate deploy

# 4. 验证迁移结果
npx prisma migrate status
```

### 8.5 零停机部署策略

1. **蓝绿部署**：
   - 准备新环境
   - 应用迁移到新环境
   - 切换流量
   - 验证后清理旧环境

2. **滚动更新**：
   - 逐步更新实例
   - 确保向后兼容的迁移
   - 监控每个步骤

### 8.6 监控和日志

```typescript
// 生产环境 Prisma Client 配置
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
})

// 监听查询事件
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query)
  console.log('Params: ' + e.params)
  console.log('Duration: ' + e.duration + 'ms')
})

// 监听错误事件
prisma.$on('error', (e) => {
  console.error('Database error:', e)
})
```

## 9. 性能优化

### 9.1 查询优化

```typescript
// 使用 select 减少数据传输
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  }
})

// 使用 include 时要谨慎
const posts = await prisma.post.findMany({
  include: {
    author: true,
    tags: true,
  },
  take: 10, // 限制结果数量
  skip: (page - 1) * 10, // 分页
})

// 使用索引优化查询
// 在 schema.prisma 中添加索引
model Post {
  // ...
  @@index([authorId, published])
  @@index([createdAt])
}
```

### 9.2 连接池配置

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // 配置连接池
  __internal: {
    engine: {
      connection_limit: 20,
    },
  },
})
```

## 10. 故障排查

### 10.1 常见问题

1. **迁移失败**：
```bash
# 检查迁移状态
npx prisma migrate status

# 重置并重新迁移（开发环境）
npx prisma migrate reset

# 手动解决迁移冲突
npx prisma migrate resolve --applied "migration_name"
```

2. **类型不匹配**：
```bash
# 重新生成客户端
npx prisma generate

# 检查 schema 语法
npx prisma format
npx prisma validate
```

3. **连接问题**：
```bash
# 测试数据库连接
npx prisma db pull
```

### 10.2 调试技巧

```typescript
// 启用查询日志
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

// 使用 $queryRaw 调试复杂查询
const result = await prisma.$queryRaw`
  EXPLAIN ANALYZE SELECT * FROM users WHERE email = ${email}
`
```

## 总结

Prisma 提供了从开发到生产的完整工具链：

1. **开发阶段**：Schema 设计、迁移生成、类型安全的查询
2. **测试阶段**：隔离的测试环境、数据清理、自动化测试
3. **部署阶段**：Docker 化、CI/CD 集成、零停机部署
4. **运维阶段**：监控、性能优化、故障排查

通过遵循这些最佳实践，可以构建出稳定、高性能的数据库应用。 