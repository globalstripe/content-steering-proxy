#!/bin/bash

# Build and push Lambda Docker image to ECR
set -e

# Configuration
AWS_REGION=${AWS_REGION:-"us-west-2"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
ECR_REPO_NAME=${ECR_REPO_NAME:-"mediapackage-proxy"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

# Check if AWS_ACCOUNT_ID is set
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "Error: AWS_ACCOUNT_ID environment variable is not set"
    echo "Please set it: export AWS_ACCOUNT_ID=123456789012"
    exit 1
fi

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FULL_IMAGE_NAME="${ECR_REGISTRY}/${ECR_REPO_NAME}:${IMAGE_TAG}"

echo "Building Lambda Docker image..."
echo "Region: ${AWS_REGION}"
echo "Account: ${AWS_ACCOUNT_ID}"
echo "Repository: ${ECR_REPO_NAME}"
echo "Tag: ${IMAGE_TAG}"
echo "Full image name: ${FULL_IMAGE_NAME}"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Check if repository exists, create if not
echo "Checking if ECR repository exists..."
if ! aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${AWS_REGION} &> /dev/null; then
    echo "Creating ECR repository: ${ECR_REPO_NAME}"
    aws ecr create-repository \
        --repository-name ${ECR_REPO_NAME} \
        --region ${AWS_REGION} \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
fi

# Build the Docker image
echo "Building Docker image..."
docker build -f Dockerfile.lambda -t ${ECR_REPO_NAME}:${IMAGE_TAG} .

# Tag the image
echo "Tagging image for ECR..."
docker tag ${ECR_REPO_NAME}:${IMAGE_TAG} ${FULL_IMAGE_NAME}

# Push the image
echo "Pushing image to ECR..."
docker push ${FULL_IMAGE_NAME}

echo "✅ Image pushed successfully: ${FULL_IMAGE_NAME}"
echo ""
echo "To deploy with CDK, run:"
echo "  cd infrastructure"
echo "  export ECR_REPO_NAME=${ECR_REPO_NAME}"
echo "  export IMAGE_TAG=${IMAGE_TAG}"
echo "  npm install"
echo "  npm run cdk deploy"
