#!/bin/bash

# Cloud Run 部署脚本
# 使用方法: ./deploy-cloud-run.sh [PROJECT_ID] [SERVICE_NAME] [REGION]

# 设置默认参数
PROJECT_ID=${1:-"your-project-id"}
SERVICE_NAME=${2:-"my-app"}
REGION=${3:-"us-central1"}
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# 检查是否在服务器环境（无GUI）
if [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ] && [ ! -t 0 ]; then
    echo "🖥️  检测到服务器环境，使用服务账号认证..."
    
    # 查找服务账号密钥文件
    if [ -f "service-account-key.json" ]; then
        echo "🔑 使用本地服务账号密钥文件认证..."
        gcloud auth activate-service-account --key-file=service-account-key.json
    elif [ ! -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
        echo "🔑 使用环境变量中的服务账号密钥文件认证..."
        gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
    elif [ ! -z "$SERVICE_ACCOUNT_KEY" ]; then
        echo "🔑 使用环境变量中的服务账号密钥认证..."
        echo $SERVICE_ACCOUNT_KEY | base64 -d > /tmp/service-account-key.json
        gcloud auth activate-service-account --key-file=/tmp/service-account-key.json
    else
        echo "❌ 服务器环境需要服务账号认证，请提供密钥文件或设置环境变量"
        echo "   方法1: 将 service-account-key.json 放在当前目录"
        echo "   方法2: 设置 GOOGLE_APPLICATION_CREDENTIALS 环境变量"
        echo "   方法3: 设置 SERVICE_ACCOUNT_KEY 环境变量（base64编码）"
        exit 1
    fi
else
    echo "🖥️  检测到交互式环境..."
fi

echo "🚀 开始部署到 Google Cloud Run..."
echo "项目ID: $PROJECT_ID"
echo "服务名: $SERVICE_NAME"
echo "区域: $REGION"
echo "镜像: $IMAGE_NAME"

# 检查是否已登录 gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ 未登录 Google Cloud，请先运行: gcloud auth login"
    exit 1
fi

# 设置项目
echo "🔧 设置 Google Cloud 项目..."
gcloud config set project $PROJECT_ID

# 启用必要的 API
echo "🔧 启用必要的 Google Cloud APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# 构建 Docker 镜像
echo "🔨 构建 Docker 镜像..."
docker build -t $IMAGE_NAME .

if [ $? -ne 0 ]; then
    echo "❌ Docker 镜像构建失败"
    exit 1
fi

# 推送镜像到 Google Container Registry
echo "📤 推送镜像到 Google Container Registry..."
docker push $IMAGE_NAME

if [ $? -ne 0 ]; then
    echo "❌ 推送镜像失败"
    exit 1
fi

# 部署到 Cloud Run
echo "🚀 部署到 Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --concurrency 80 \
    --max-instances 10 \
    --set-env-vars NODE_ENV=production

if [ $? -eq 0 ]; then
    echo "✅ 部署成功！"
    
    # 获取服务 URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
    echo "🌐 服务 URL: $SERVICE_URL"
    echo "🔍 GraphQL Endpoint: $SERVICE_URL/graphql"
    echo "❤️  Health Check: $SERVICE_URL/health"
    
    # 显示日志命令
    echo ""
    echo "📊 查看日志命令:"
    echo "gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --limit 50 --format json"
    
else
    echo "❌ 部署失败"
    exit 1
fi 