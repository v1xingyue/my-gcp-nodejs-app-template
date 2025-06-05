# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装系统依赖（包括 OpenSSL，Prisma 需要）
RUN apk add --no-cache \
    openssl \
    libc6-compat

# 复制 package 文件
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装所有依赖
RUN pnpm install --frozen-lockfile

# 复制源代码和 Prisma schema
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建 TypeScript 应用
RUN npm run build

# 安装仅生产依赖
RUN pnpm install --frozen-lockfile --production && pnpm store prune

# 生产阶段
FROM node:18-alpine AS production

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8080

# 安装系统依赖
RUN apk add --no-cache \
    openssl \
    libc6-compat

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nodejs

# 创建应用目录并设置权限
RUN mkdir -p /app && chown -R nodejs:nodejs /app
WORKDIR /app

# 切换到非 root 用户
USER nodejs

# 安装 pnpm（生产环境需要用于运行 prisma migrate deploy）
USER root
RUN npm install -g pnpm
USER nodejs

# 复制 package 文件（prisma 命令需要）
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# 复制生产依赖
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# 复制 Prisma schema 和生成的 client
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# 复制构建后的应用
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# # 健康检查
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#     CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/health || exit 1

# # 暴露端口（Cloud Run 使用 8080）
# EXPOSE 8080

# # 启动应用（包含数据库迁移）
# CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"] 