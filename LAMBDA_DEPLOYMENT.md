# Lambda Deployment Guide

This guide explains how to deploy the MediaPackage Proxy as an AWS Lambda function using Docker images and CDK.

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Docker** installed and running
3. **Node.js** 18+ and npm installed
4. **AWS CDK CLI** installed: `npm install -g aws-cdk`
5. **AWS Account** with permissions to:
   - Create ECR repositories
   - Deploy Lambda functions
   - Create IAM roles and policies

## Architecture

- **Lambda Function**: Container-based Lambda using Docker image
- **Function URL**: HTTP endpoint for the Lambda function
- **ECR**: Docker image repository
- **CDK**: Infrastructure as Code

## Quick Start

### 1. Set Environment Variables

```bash
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-west-2
export ECR_REPO_NAME=mediapackage-proxy
export IMAGE_TAG=latest
export PROXY_TARGET=https://your-mediapackage-endpoint.amazonaws.com
```

### 2. Build and Push Docker Image

```bash
./scripts/build-lambda-docker.sh
```

This script will:
- Login to ECR
- Create ECR repository if it doesn't exist
- Build the Docker image using `Dockerfile.lambda`
- Push the image to ECR

### 3. Deploy Lambda Function

```bash
./scripts/deploy-lambda.sh
```

This script will:
- Install CDK dependencies
- Bootstrap CDK (if needed)
- Deploy the Lambda function with Function URL

### 4. Get Function URL

After deployment, the Function URL will be displayed in the CDK output. You can also retrieve it:

```bash
aws lambda get-function-url-config \
  --function-name mediapackage-proxy \
  --region us-west-2 \
  --query FunctionUrl \
  --output text
```

## Manual Deployment Steps

If you prefer to run the commands manually:

### Step 1: Install Dependencies

```bash
# Install Lambda dependencies
npm install

# Install CDK dependencies
cd infrastructure
npm install
```

### Step 2: Build Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-west-2.amazonaws.com

# Create ECR repository (if needed)
aws ecr create-repository \
  --repository-name mediapackage-proxy \
  --region us-west-2

# Build image
docker build -f Dockerfile.lambda -t mediapackage-proxy:latest .

# Tag image
docker tag mediapackage-proxy:latest \
  123456789012.dkr.ecr.us-west-2.amazonaws.com/mediapackage-proxy:latest

# Push image
docker push \
  123456789012.dkr.ecr.us-west-2.amazonaws.com/mediapackage-proxy:latest
```

### Step 3: Deploy with CDK

```bash
cd infrastructure

# Bootstrap CDK (first time only)
npx cdk bootstrap aws://123456789012/us-west-2

# Synthesize stack
npx cdk synth

# Deploy stack
npx cdk deploy
```

## Configuration

### Environment Variables

Set these in the CDK stack or via environment variables:

- `PROXY_TARGET`: MediaPackage endpoint URL
- `NODE_ENV`: Set to `production` for Lambda

### Lambda Settings

Current configuration in `infrastructure/lib/mediapackage-proxy-stack.ts`:

- **Memory**: 1024 MB
- **Timeout**: 30 seconds
- **Architecture**: x86_64
- **Function URL**: Enabled with CORS

You can modify these in the CDK stack file.

## Testing

### Test Locally

```bash
# Test the Docker image locally
docker run -p 9000:8080 \
  -e PROXY_TARGET=https://your-mediapackage-endpoint.amazonaws.com \
  mediapackage-proxy:latest

# Test with Lambda Runtime Interface Emulator
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -d '{"httpMethod":"GET","path":"/health"}'
```

### Test Deployed Function

```bash
# Get Function URL
FUNCTION_URL=$(aws lambda get-function-url-config \
  --function-name mediapackage-proxy \
  --region us-west-2 \
  --query FunctionUrl \
  --output text)

# Test health endpoint
curl ${FUNCTION_URL}/health

# Test JWT encoding
curl "${FUNCTION_URL}/jwt/encode"

# Test DASH parameters
curl "${FUNCTION_URL}/dash-params?_DASH_pathway=alpha&_DASH_throughput=84267048"
```

## Updating the Function

### Update Code and Redeploy

1. **Update code** in `index.js`
2. **Rebuild and push** Docker image:
   ```bash
   export IMAGE_TAG=v1.0.1  # Use new tag
   ./scripts/build-lambda-docker.sh
   ```
3. **Update CDK stack** with new image tag:
   ```bash
   export IMAGE_TAG=v1.0.1
   ./scripts/deploy-lambda.sh
   ```

## Monitoring

### CloudWatch Logs

```bash
# View logs
aws logs tail /aws/lambda/mediapackage-proxy --follow

# Or via AWS Console
# CloudWatch > Log groups > /aws/lambda/mediapackage-proxy
```

### Metrics

Monitor via AWS Console:
- CloudWatch > Metrics > Lambda
- Function name: `mediapackage-proxy`

Key metrics:
- Invocations
- Duration
- Errors
- Throttles

## Security

### Function URL Authentication

Currently set to `NONE` for easy testing. For production:

1. Update `mediapackage-proxy-stack.ts`:
   ```typescript
   authType: lambda.FunctionUrlAuthType.AWS_IAM
   ```

2. Create IAM policy for clients to invoke:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": "lambda:InvokeFunctionUrl",
       "Resource": "arn:aws:lambda:region:account:function:mediapackage-proxy"
     }]
   }
   ```

### CORS Configuration

Update CORS settings in the CDK stack for production:
- Remove `allowedOrigins: ['*']`
- Specify allowed origins
- Configure allowed headers and methods

## Troubleshooting

### Image Build Issues

```bash
# Check Docker is running
docker ps

# Verify ECR login
aws ecr describe-repositories --region us-west-2
```

### Deployment Issues

```bash
# Check CDK bootstrap
aws cloudformation describe-stacks \
  --stack-name CDKToolkit \
  --region us-west-2

# View CDK diff
cd infrastructure
npx cdk diff
```

### Function Errors

```bash
# Check function logs
aws logs tail /aws/lambda/mediapackage-proxy --follow

# Test function locally
docker run -p 9000:8080 \
  -e PROXY_TARGET=https://your-endpoint.amazonaws.com \
  mediapackage-proxy:latest
```

## Cost Estimation

Approximate costs (us-west-2):

- **Lambda**: $0.20 per 1M requests + $0.0000166667 per GB-second
- **ECR**: $0.10 per GB/month (first 500 MB free)
- **Function URL**: Included in Lambda pricing
- **CloudWatch Logs**: $0.50 per GB ingested

Example for 1M requests/month:
- ~$0.20 Lambda compute
- ~$0.10 ECR storage
- **Total**: ~$0.30/month

## Cleanup

To remove all resources:

```bash
cd infrastructure
npx cdk destroy

# Optionally delete ECR repository
aws ecr delete-repository \
  --repository-name mediapackage-proxy \
  --force \
  --region us-west-2
```

## Additional Resources

- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)
