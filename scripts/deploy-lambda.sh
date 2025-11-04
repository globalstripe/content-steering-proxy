#!/bin/bash

# Deploy Lambda function using CDK
set -e

# Configuration
AWS_REGION=${AWS_REGION:-"us-west-2"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
ECR_REPO_NAME=${ECR_REPO_NAME:-"mediapackage-proxy"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
PROXY_TARGET=${PROXY_TARGET:-""}

# Check if AWS_ACCOUNT_ID is set
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "Error: AWS_ACCOUNT_ID environment variable is not set"
    echo "Please set it: export AWS_ACCOUNT_ID=123456789012"
    exit 1
fi

# Check if PROXY_TARGET is set
if [ -z "$PROXY_TARGET" ]; then
    echo "Warning: PROXY_TARGET environment variable is not set"
    echo "Using default MediaPackage endpoint"
fi

echo "Deploying MediaPackage Proxy Lambda function..."
echo "Region: ${AWS_REGION}"
echo "Account: ${AWS_ACCOUNT_ID}"
echo "Repository: ${ECR_REPO_NAME}"
echo "Image Tag: ${IMAGE_TAG}"

# Navigate to infrastructure directory
cd infrastructure

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing CDK dependencies..."
    npm install
fi

# Bootstrap CDK if needed
echo "Bootstrapping CDK (if needed)..."
npx cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION} || true

# Set environment variables for CDK
export CDK_DEFAULT_ACCOUNT=${AWS_ACCOUNT_ID}
export CDK_DEFAULT_REGION=${AWS_REGION}
export ECR_REPO_NAME=${ECR_REPO_NAME}
export IMAGE_TAG=${IMAGE_TAG}
if [ -n "$PROXY_TARGET" ]; then
    export PROXY_TARGET=${PROXY_TARGET}
fi

# Synthesize and deploy
echo "Synthesizing CDK stack..."
npx cdk synth

echo "Deploying CDK stack..."
npx cdk deploy --require-approval never

echo "✅ Deployment completed successfully!"
echo ""
echo "To get the Function URL, check the CloudFormation outputs or run:"
echo "  aws lambda get-function-url-config --function-name mediapackage-proxy --region ${AWS_REGION}"
