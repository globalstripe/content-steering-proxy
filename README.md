# Express MediaPackage Proxy

A Node.js Express proxy server for AWS MediaPackage with content steering and JWT encoding capabilities.

## Features

- **MediaPackage Proxy**: Proxies requests to AWS MediaPackage endpoints
- **Content Steering**: Modifies HLS manifests to include content steering parameters
- **Health Monitoring**: Automatic health checks with 60-second intervals
- **JWT Encoding**: Generate JWT tokens for content steering parameters
- **Environment Configuration**: Uses `.env.local` for configuration

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
PROXY_TARGET=https://your-mediapackage-endpoint.amazonaws.com
```

3. Start the server:
```bash
node index.js
```

The server will start on port 8081 with the following endpoints available.

## API Endpoints

### Health Check
- **GET** `/health` - Returns server health status

### JWT Encoding
- **GET** `/jwt/encode` - Encode payload to base64 string (query parameters)
- **POST** `/jwt/encode` - Encode payload to base64 string (JSON body)
- **GET** `/jwt/generate` - Generate full JWT token (query parameters)
- **POST** `/jwt/generate` - Generate full JWT token (JSON body)

## JWT Encoding Examples

### 1. Encode with Default Values
```bash
curl http://localhost:8081/jwt/encode
```

**Response:**
```json
{
  "encoded": "eyJtaW5CaXRyYXRlIjo5MTQ4NzgsImNkbk9yZGVyIjpbImNkbi1jIiwiY2RuLWEiLCJjZG4tYiJdLCJwYXRod2F5cyI6W3siaWQiOiJjZG4tYSIsInRocm91Z2hwdXQiOjkwMDAwMDB9LHsiaWQiOiJjZG4tYiIsInRocm91Z2hwdXQiOjgwMDAwMDB9LHsiaWQiOiJjZG4tYyIsInRocm91Z2hwdXQiOjEwMDB9XSwidGltZXN0YW1wIjoxNzYwODc5ODg1NDM5fQ==",
  "payload": {
    "minBitrate": 914878,
    "cdnOrder": ["cdn-c", "cdn-a", "cdn-b"],
    "pathways": [
      { "id": "cdn-a", "throughput": 9000000 },
      { "id": "cdn-b", "throughput": 8000000 },
      { "id": "cdn-c", "throughput": 1000 }
    ],
    "timestamp": 1760879885439
  }
}
```

### 2. Encode with Custom Values (Query Parameters)
```bash
curl "http://localhost:8081/jwt/encode?minBitrate=1000000&timestamp=1234567890"
```

### 3. Encode with Custom Values (JSON Body)
```bash
curl -X POST http://localhost:8081/jwt/encode \
  -H "Content-Type: application/json" \
  -d '{
    "minBitrate": 1000000,
    "cdnOrder": ["cdn-a", "cdn-b", "cdn-c"],
    "pathways": [
      { "id": "cdn-a", "throughput": 10000000 },
      { "id": "cdn-b", "throughput": 5000000 },
      { "id": "cdn-c", "throughput": 2000 }
    ],
    "timestamp": 1234567890
  }'
```

### 4. Generate Full JWT Token
```bash
curl -X POST http://localhost:8081/jwt/generate \
  -H "Content-Type: application/json" \
  -d '{
    "minBitrate": 1000000,
    "timestamp": 1234567890
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJub25lIn0.eyJtaW5CaXRyYXRlIjoxMDAwMDAwLCJjZG5PcmRlciI6WyJjZG4tYyIsImNkbi1hIiwiY2RuLWIiXSwicGF0aHdheXMiOlt7ImlkIjoiY2RuLWEiLCJ0aHJvdWdocHV0Ijo5MDAwMDAwfSx7ImlkIjoiY2RuLWIiLCJ0aHJvdWdocHV0Ijo4MDAwMDAwfSx7ImlkIjoiY2RuLWMiLCJ0aHJvdWdocHV0IjoxMDAwfV0sInRpbWVzdGFtcCI6MTIzNDU2Nzg5MH0.",
  "payload": {
    "minBitrate": 1000000,
    "cdnOrder": ["cdn-c", "cdn-a", "cdn-b"],
    "pathways": [
      { "id": "cdn-a", "throughput": 9000000 },
      { "id": "cdn-b", "throughput": 8000000 },
      { "id": "cdn-c", "throughput": 1000 }
    ],
    "timestamp": 1234567890
  }
}
```

### 5. Generate JWT with Secret
```bash
curl "http://localhost:8081/jwt/generate?secret=mysecret&minBitrate=1000000"
```

## Health Check

Monitor server health:
```bash
curl http://localhost:8081/health
```

**Response:**
```json
{
  "status": "healthy",
  "target": "https://your-mediapackage-endpoint.amazonaws.com",
  "lastCheck": "2024-01-15T10:30:45.123Z",
  "responseTime": 245,
  "error": null
}
```

## Configuration

### Environment Variables

Create a `.env.local` file with:

```env
PROXY_TARGET=https://your-mediapackage-endpoint.amazonaws.com
```

### Default JWT Payload Structure

The JWT encoding functions use this default structure:

```json
{
  "minBitrate": 914878,
  "cdnOrder": ["cdn-c", "cdn-a", "cdn-b"],
  "pathways": [
    { "id": "cdn-a", "throughput": 9000000 },
    { "id": "cdn-b", "throughput": 8000000 },
    { "id": "cdn-c", "throughput": 1000 }
  ],
  "timestamp": 1760879885439
}
```

## Content Steering

The proxy automatically modifies HLS manifests to include content steering parameters:

- Updates `#EXT-X-VERSION` from 3 to 7
- Adds `#EXT-X-CONTENT-STEERING` tags
- Maintains original MediaPackage functionality

## Dependencies

- `express` - Web framework
- `http-proxy-middleware` - HTTP proxy middleware
- `jsonwebtoken` - JWT token handling
- `dotenv` - Environment variable loading
- `m3u8-parser` - HLS manifest parsing

## Deployment Options

This application can be deployed in multiple ways:

1. **Lambda Function** (Serverless) - See [LAMBDA_DEPLOYMENT.md](./LAMBDA_DEPLOYMENT.md)
2. **Kubernetes (EKS)** - See Kubernetes Deployment section below
3. **Local Development** - Run directly with `node index.js`

## Lambda Deployment (AWS)

Deploy as a serverless Lambda function using Docker images and CDK:

**Quick Start:**
```bash
# Set environment variables
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-west-2
export PROXY_TARGET=https://your-mediapackage-endpoint.amazonaws.com

# Build and push Docker image
./scripts/build-lambda-docker.sh

# Deploy Lambda function
./scripts/deploy-lambda.sh
```

For detailed instructions, see [LAMBDA_DEPLOYMENT.md](./LAMBDA_DEPLOYMENT.md).

**Features:**
- Serverless architecture (pay per request)
- Automatic scaling
- Function URL for HTTP access
- Container-based deployment
- Infrastructure as Code with CDK

## Kubernetes Deployment

This application can be deployed to an EKS cluster using the provided Kubernetes manifests.

### Prerequisites

1. **EKS Cluster**: Running EKS cluster with kubectl configured
2. **Docker Registry**: Access to a container registry (ECR, Docker Hub, etc.)
3. **Ingress Controller**: NGINX Ingress Controller installed
4. **TLS Certificate**: SSL certificate for your domain

### Quick Deployment

1. **Build and push the Docker image:**
```bash
# Set your registry
export DOCKER_REGISTRY=your-registry.com
export TAG=v1.0.0

# Build and push
./scripts/build-and-push.sh
```

2. **Deploy to EKS:**
```bash
./scripts/deploy.sh
```

3. **Update the ingress hostname:**
```bash
# Edit k8s/ingress.yaml and replace 'yourdomain.com' with your actual domain
kubectl apply -f k8s/ingress.yaml
```

### Configuration

#### Environment Variables
Update `k8s/configmap.yaml` with your MediaPackage endpoint:
```yaml
data:
  PROXY_TARGET: "https://your-mediapackage-endpoint.amazonaws.com"
```

#### Scaling
The deployment includes Horizontal Pod Autoscaler (HPA) that automatically scales your application based on resource usage:

**HPA Configuration:**
- **Min replicas**: 2 (always maintains minimum availability)
- **Max replicas**: 10 (prevents resource exhaustion)
- **CPU target**: 70% (scales up when average CPU > 70%)
- **Memory target**: 80% (scales up when average memory > 80%)

**How HPA Works:**
1. **Monitoring**: Continuously monitors CPU and memory usage across all pods
2. **Scaling Up**: When resource usage exceeds thresholds, automatically adds more pods
3. **Scaling Down**: When usage drops, removes excess pods to save resources
4. **Load Distribution**: New pods automatically receive traffic via the service

**Example Scenario:**
```
Normal Load: 2 pods (CPU: 30%, Memory: 40%) → HPA: No action
Traffic Spike: CPU hits 75% → HPA: Adds 2-3 more pods
Load Distribution: 5 pods handling traffic → HPA: Monitors
Traffic Drops: CPU drops to 25% → HPA: Removes 2-3 pods
Result: Back to 2 pods, cost optimized
```

**Benefits:**
- **Cost Efficient**: Only runs pods when needed
- **High Availability**: Always maintains minimum pods
- **Automatic**: No manual intervention required
- **Performance**: Handles traffic spikes seamlessly

#### Health Checks
- **Liveness probe**: `/health` endpoint every 30s
- **Readiness probe**: `/health` endpoint every 10s
- **Startup delay**: 30s for liveness, 10s for readiness

### Monitoring

Check deployment status:
```bash
kubectl get pods -n mediapackage-proxy
kubectl get services -n mediapackage-proxy
kubectl get ingress -n mediapackage-proxy
kubectl get hpa -n mediapackage-proxy
```

View logs:
```bash
kubectl logs -f deployment/mediapackage-proxy -n mediapackage-proxy
```

Port forward for local testing:
```bash
kubectl port-forward service/mediapackage-proxy-service 8081:80 -n mediapackage-proxy
```

### Cleanup

Remove all resources:
```bash
./scripts/cleanup.sh
```

### Security Features

- **Non-root user**: Container runs as user 1001
- **Read-only filesystem**: Enhanced security
- **Resource limits**: CPU and memory constraints
- **Security context**: Privilege escalation disabled

## License

ISC
