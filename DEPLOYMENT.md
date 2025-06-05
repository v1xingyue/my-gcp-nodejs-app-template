# Google Cloud Run 部署指南

## 前置要求

1. **Google Cloud 账户和项目**
   - 拥有 Google Cloud 账户
   - 创建或选择一个 Google Cloud 项目
   - 启用计费（Cloud Run 需要）

2. **本地工具安装**
   ```bash
   # 安装 Google Cloud CLI
   # macOS
   brew install google-cloud-sdk
   
   # 其他系统：https://cloud.google.com/sdk/docs/install
   
   # 安装 Docker
   # https://docs.docker.com/get-docker/
   ```

3. **认证设置**
   ```bash
   # 登录 Google Cloud
   gcloud auth login
   
   # 配置 Docker 认证
   gcloud auth configure-docker
   ```

## 快速部署

### 方法 1: 使用部署脚本（推荐）

```bash
# 给脚本添加执行权限
chmod +x deploy-cloud-run.sh

# 部署到 Cloud Run
./deploy-cloud-run.sh YOUR_PROJECT_ID YOUR_SERVICE_NAME us-central1
```

### 方法 2: 手动部署

```bash
# 1. 设置环境变量
export PROJECT_ID="your-project-id"
export SERVICE_NAME="my-app"
export REGION="us-central1"

# 2. 构建 Docker 镜像
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME .

# 3. 推送镜像
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME

# 4. 部署到 Cloud Run
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated
```

### 方法 3: 使用 YAML 配置文件

```bash
# 修改 cloud-run.yaml 中的 PROJECT_ID 和 SERVICE_NAME
# 然后部署
gcloud run services replace cloud-run.yaml --region=us-central1
```

## 数据库配置

### 使用 Cloud SQL

1. **创建 Cloud SQL 实例**
   ```bash
   gcloud sql instances create my-postgres-instance \
       --database-version=POSTGRES_15 \
       --tier=db-f1-micro \
       --region=us-central1
   ```

2. **创建数据库和用户**
   ```bash
   gcloud sql databases create myapp --instance=my-postgres-instance
   gcloud sql users create myuser --instance=my-postgres-instance --password=mypassword
   ```

3. **获取连接信息**
   ```bash
   gcloud sql instances describe my-postgres-instance
   ```

4. **设置环境变量**
   ```bash
   # 在 Cloud Run 中设置环境变量
   gcloud run services update my-app \
       --set-env-vars DATABASE_URL="postgresql://myuser:mypassword@/myapp?host=/cloudsql/PROJECT_ID:us-central1:my-postgres-instance" \
       --region us-central1
   ```

### 使用外部数据库

```bash
# 设置数据库连接字符串
gcloud run services update my-app \
    --set-env-vars DATABASE_URL="postgresql://user:pass@host:port/db" \
    --region us-central1
```

## 环境变量配置

### 设置单个环境变量

```bash
gcloud run services update my-app \
    --set-env-vars NODE_ENV=production,PORT=8080 \
    --region us-central1
```

### 使用 Secret Manager

1. **创建 Secret**
   ```bash
   echo -n "postgresql://user:pass@host:port/db" | gcloud secrets create database-url --data-file=-
   ```

2. **授权 Cloud Run 访问 Secret**
   ```bash
   gcloud secrets add-iam-policy-binding database-url \
       --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
       --role="roles/secretmanager.secretAccessor"
   ```

3. **在 Cloud Run 中使用 Secret**
   ```bash
   gcloud run services update my-app \
       --set-secrets DATABASE_URL=database-url:latest \
       --region us-central1
   ```

## 域名和 HTTPS

### 自定义域名

```bash
# 1. 映射域名
gcloud run domain-mappings create \
    --service my-app \
    --domain your-domain.com \
    --region us-central1

# 2. 配置 DNS 记录
# 将域名的 CNAME 记录指向 Cloud Run 提供的地址
```

## 监控和日志

### 查看日志

```bash
# 实时日志
gcloud run services logs tail my-app --region us-central1

# 历史日志
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=my-app" \
    --limit 100 --format json
```

### 设置监控

1. **启用 Cloud Monitoring**
   ```bash
   gcloud services enable monitoring.googleapis.com
   ```

2. **创建告警策略**
   - 访问 Google Cloud Console
   - 导航到 Monitoring > Alerting
   - 创建基于 Cloud Run 指标的告警

## 性能优化

### 1. 冷启动优化

```yaml
# 在 cloud-run.yaml 中设置最小实例数
annotations:
  autoscaling.knative.dev/minScale: "1"
```

### 2. 并发优化

```yaml
# 调整并发设置
spec:
  containerConcurrency: 80  # 根据应用性能调整
```

### 3. 资源配置

```yaml
resources:
  limits:
    cpu: "2"      # 增加 CPU
    memory: "2Gi" # 增加内存
```

## 故障排查

### 常见问题

1. **镜像构建失败**
   ```bash
   # 检查 Docker 是否运行
   docker --version
   
   # 检查 Dockerfile 语法
   docker build --no-cache -t test-image .
   ```

2. **部署失败**
   ```bash
   # 查看部署日志
   gcloud run services describe my-app --region us-central1
   
   # 检查服务状态
   gcloud run revisions list --service my-app --region us-central1
   ```

3. **应用启动失败**
   ```bash
   # 查看应用日志
   gcloud run services logs tail my-app --region us-central1
   
   # 检查环境变量
   gcloud run services describe my-app --region us-central1 --format="export"
   ```

4. **数据库连接问题**
   ```bash
   # 测试数据库连接（在本地）
   npm run db:generate
   npx prisma db pull
   
   # 检查 Cloud SQL 连接
   gcloud sql connect my-postgres-instance --user=myuser
   ```

## 成本优化

### 1. 使用最小配置
```bash
gcloud run deploy my-app \
    --cpu=0.5 \
    --memory=512Mi \
    --max-instances=5 \
    --concurrency=100
```

### 2. 设置自动缩放
```bash
gcloud run services update my-app \
    --min-instances=0 \
    --max-instances=10 \
    --region us-central1
```

### 3. 监控使用情况
- 定期检查 Cloud Console 中的使用统计
- 设置预算警报

## 安全配置

### 1. 限制访问
```bash
# 移除公共访问
gcloud run services remove-iam-policy-binding my-app \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region us-central1

# 添加特定用户访问
gcloud run services add-iam-policy-binding my-app \
    --member="user:user@example.com" \
    --role="roles/run.invoker" \
    --region us-central1
```

### 2. 使用服务账户
```bash
# 创建服务账户
gcloud iam service-accounts create cloud-run-sa

# 部署时指定服务账户
gcloud run deploy my-app \
    --service-account=cloud-run-sa@PROJECT_ID.iam.gserviceaccount.com
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - id: 'auth'
      uses: 'google-github-actions/auth@v1'
      with:
        credentials_json: '${{ secrets.GCP_SA_KEY }}'
    
    - name: 'Set up Cloud SDK'
      uses: 'google-github-actions/setup-gcloud@v1'
    
    - name: 'Build and Deploy'
      run: |
        gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/my-app
        gcloud run deploy my-app \
          --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/my-app \
          --region us-central1 \
          --platform managed
```

## 有用的命令

```bash
# 查看所有 Cloud Run 服务
gcloud run services list

# 查看服务详情
gcloud run services describe SERVICE_NAME --region REGION

# 更新服务配置
gcloud run services update SERVICE_NAME --region REGION

# 删除服务
gcloud run services delete SERVICE_NAME --region REGION

# 查看修订版本
gcloud run revisions list --service SERVICE_NAME --region REGION

# 设置流量分配
gcloud run services update-traffic SERVICE_NAME --to-revisions=REVISION=PERCENTAGE
``` 