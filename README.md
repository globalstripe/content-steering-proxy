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

## License

ISC
