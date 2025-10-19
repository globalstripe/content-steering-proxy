// https://6180c994cb835402.mediapackage.eu-west-1.amazonaws.com/out/v1/1ddf1ec05c0b4585bcf3df2a40d5ffdf/index.m3u8

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { Transform } = require('stream');
const jwt = require('jsonwebtoken');

// Some useful parses
// https://www.npmjs.com/package/m3u8-parser
const m3u8Parser = require('m3u8-parser');

const hlsParser = new m3u8Parser.Parser();



const hlshcsm = {
    "VERSION": 1,
    "TTL": 10,
    "RELOAD-URI": "https://cloudfront.content-steering.com/dash.dcsm?steering_params=eyJtaW5CaXRyYXRlIjo5MTQ4NzgsImNkbk9yZGVyIjpbImNkbi1jIiwiY2RuLWEiLCJjZG4tYiJdLCJwYXRod2F5cyI6W3siaWQiOiJjZG4tYSIsInRocm91Z2hwdXQiOjkwMDAwMDB9LHsiaWQiOiJjZG4tYiIsInRocm91Z2hwdXQiOjgwMDAwMDB9LHsiaWQiOiJjZG4tYyIsInRocm91Z2hwdXQiOjEwMDB9XSwidGltZXN0YW1wIjoxNzYwNzMwMDEwNjIyfQ==",
    "PATHWAY-PRIORITY": [
        "cdn-c",
        "cdn-a",
        "cdn-b"
    ]
}

const contentSteeringURI = '#EXT-X-CONTENT-STEERING:SERVER-URI="https://cloudfront.content-steering.com/hls.hcsm?steering_params=eyJjZG5PcmRlciI6WyJjZG4tYyIsImNkbi1hIiwiY2RuLWIiXSwibWluQml0cmF0ZSI6MTQyMDY5MiwicGF0aHdheXMiOlt7ImlkIjoiY2RuLWMiLCJ0aHJvdWdocHV0IjoyMDAwMDAwMH0seyJpZCI6ImNkbi1hIiwidGhyb3VnaHB1dCI6MjAwMDAwMDB9LHsiaWQiOiJjZG4tYiIsInRocm91Z2hwdXQiOjIwMDAwMDAwfV19",PATHWAY-ID="cdn-a"'
const pathA = '#EXT-X-MEDIA:URI="https://cloudfront.content-steering.com/bbb_hls/audio_128kbps/playlist.m3u8",TYPE=AUDIO,GROUP-ID="cdn-a",LANGUAGE="en",NAME="English",DEFAULT=NO,AUTOSELECT=YES'
const pathC = '#EXT-X-MEDIA:URI="https://akamai.content-steering.com/bbb_hls/audio_128kbps/playlist.m3u8",TYPE=AUDIO,GROUP-ID="cdn-c",LANGUAGE="en",NAME="English",DEFAULT=NO,AUTOSELECT=YES'
const pathB = '#EXT-X-MEDIA:URI="https://fastly.content-steering.com/bbb_hls/audio_128kbps/playlist.m3u8",TYPE=AUDIO,GROUP-ID="cdn-b",LANGUAGE="en",NAME="English",DEFAULT=NO,AUTOSELECT=YES'

const app = express();

// Middleware
app.use(express.json());

// JWT encoding function for content steering parameters
function encodeSteeringParams(payload) {
    // Default payload structure based on your example
    const defaultPayload = {
        minBitrate: 914878,
        cdnOrder: ["cdn-c", "cdn-a", "cdn-b"],
        pathways: [
            { id: "cdn-a", throughput: 9000000 },
            { id: "cdn-b", throughput: 8000000 },
            { id: "cdn-c", throughput: 1000 }
        ],
        timestamp: Date.now()
    };
    
    // Merge with provided payload
    const finalPayload = { ...defaultPayload, ...payload };
    
    // Create JWT token (unsigned for now, but you can add a secret if needed)
    const token = jwt.sign(finalPayload, '', { algorithm: 'none' });
    
    // Extract just the payload part (middle section of JWT)
    const parts = token.split('.');
    return parts[1]; // This is the base64-encoded payload
}

// Function to generate full JWT token with secret (if needed)
function generateJWT(payload, secret = '') {
    const defaultPayload = {
        minBitrate: 914878,
        cdnOrder: ["cdn-c", "cdn-a", "cdn-b"],
        pathways: [
            { id: "cdn-a", throughput: 9000000 },
            { id: "cdn-b", throughput: 8000000 },
            { id: "cdn-c", throughput: 1000 }
        ],
        timestamp: Date.now()
    };
    
    const finalPayload = { ...defaultPayload, ...payload };
    
    if (secret) {
        return jwt.sign(finalPayload, secret);
    } else {
        return jwt.sign(finalPayload, '', { algorithm: 'none' });
    }
}

// Health check configuration
let healthStatus = {
    isHealthy: false,
    lastCheck: null,
    lastError: null,
    responseTime: null
};

let healthCheckCounter = 0;
let isHealthCheckRunning = false;
const processId = process.pid;

// Health check function - simplified and more reliable
async function performHealthCheck() {
    // Prevent multiple health checks from running simultaneously
    if (isHealthCheckRunning) {
        console.log(`[${new Date().toISOString()}] [PID:${processId}] Health check already running, skipping...`);
        return;
    }
    
    isHealthCheckRunning = true;
    healthCheckCounter++;
    const checkId = healthCheckCounter;
    const startTime = Date.now();
    const https = require('https');
    
    console.log(`[${new Date().toISOString()}] [PID:${processId}] Starting health check #${checkId}`);
    
    return new Promise((resolve) => {
        // Test basic connectivity to the MediaPackage endpoint
        // We'll accept any response as long as we can connect (even 404 is fine)
        const req = https.request(process.env.PROXY_TARGET, { 
            method: 'HEAD',
            timeout: 8000, // 8 second timeout
            headers: {
                'User-Agent': 'MediaPackage-Proxy-HealthCheck/1.0'
            }
        }, (res) => {
            const responseTime = Date.now() - startTime;
            
            // Any response means the server is reachable and responding
            // 404 is expected for the root path, but server is still healthy
            healthStatus = {
                isHealthy: true,
                lastCheck: new Date().toISOString(),
                lastError: null,
                responseTime: responseTime
            };
            
            console.log(`[${new Date().toISOString()}] Health check #${checkId}: HEALTHY - Status: ${res.statusCode}, Response time: ${responseTime}ms`);
            isHealthCheckRunning = false;
            resolve();
        });
        
        req.on('error', (err) => {
            const responseTime = Date.now() - startTime;
            
            healthStatus = {
                isHealthy: false,
                lastCheck: new Date().toISOString(),
                lastError: err.message,
                responseTime: responseTime
            };
            
            console.log(`[${new Date().toISOString()}] Health check #${checkId}: UNHEALTHY - Error: ${err.message}, Response time: ${responseTime}ms`);
            isHealthCheckRunning = false;
            resolve();
        });
        
        req.on('timeout', () => {
            const responseTime = Date.now() - startTime;
            
            healthStatus = {
                isHealthy: false,
                lastCheck: new Date().toISOString(),
                lastError: 'Request timeout (8s)',
                responseTime: responseTime
            };
            
            console.log(`[${new Date().toISOString()}] Health check #${checkId}: UNHEALTHY - Timeout after ${responseTime}ms`);
            req.destroy();
            isHealthCheckRunning = false;
            resolve();
        });
        
        req.end();
    });
}

// Start health check interval (every 60 seconds to reduce load)
console.log('Setting up health check interval: 60 seconds');
const healthCheckInterval = setInterval(() => {
    console.log(`[${new Date().toISOString()}] [PID:${processId}] Health check interval triggered`);
    performHealthCheck();
}, 60000);

// Perform initial health check
console.log('Performing initial health check...');
performHealthCheck();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: healthStatus.isHealthy ? 'healthy' : 'unhealthy',
        target: process.env.PROXY_TARGET,
        lastCheck: healthStatus.lastCheck,
        responseTime: healthStatus.responseTime,
        error: healthStatus.lastError
    });
});

// JWT encoding endpoints
app.get('/jwt/encode', (req, res) => {
    try {
        const payload = req.query;
        const encodedPayload = encodeSteeringParams(payload);
        res.json({
            encoded: encodedPayload,
            payload: JSON.parse(Buffer.from(encodedPayload, 'base64').toString())
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/jwt/encode', (req, res) => {
    try {
        const payload = req.body;
        const encodedPayload = encodeSteeringParams(payload);
        res.json({
            encoded: encodedPayload,
            payload: JSON.parse(Buffer.from(encodedPayload, 'base64').toString())
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/jwt/generate', (req, res) => {
    try {
        const payload = req.query;
        const secret = req.query.secret || '';
        const token = generateJWT(payload, secret);
        res.json({
            token: token,
            payload: JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/jwt/generate', (req, res) => {
    try {
        const { payload, secret = '' } = req.body;
        const token = generateJWT(payload, secret);
        res.json({
            token: token,
            payload: JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Handle all requests
app.use(async (req, res, next) => {
    console.log('Request Path', req.path);
    
    if (req.path.match(/\.(m3u8|mpd)$/)) {
        console.log('Processing manifest file');
        
        try {
            // Make direct request to MediaPackage
            const https = require('https');
            const targetUrl = process.env.PROXY_TARGET + req.path;
            console.log('Fetching from:', targetUrl);
            
            https.get(targetUrl, (proxyRes) => {
                console.log('Response status:', proxyRes.statusCode);
                
                let data = '';
                proxyRes.on('data', chunk => {
                    data += chunk.toString();
                });
                
                proxyRes.on('end', () => {
                    console.log('Response complete, data length:', data.length);
                    console.log('Original data preview:', data.substring(0, 200) + '...');
                    
                    // Validate m3u8
                    if (!data.startsWith('#EXTM3U')) {
                        console.error('Invalid m3u8 file');
                        res.statusCode = 500;
                        res.end('Invalid m3u8 response');
                        return;
                    }
                    
                    // Replace EXT-X-VERSION:3 with EXT-X-VERSION:7
                    const versionUpdatedData = data.replace(/#EXT-X-VERSION:3/g, '#EXT-X-VERSION:7');
                    console.log('Version updated data preview:', versionUpdatedData.substring(0, 200) + '...');
                    
                    // Insert content steering tag as the 2nd line (after #EXTM3U)
                    // Add Content Steering tag after #EXTM3U
                    const modifiedData = versionUpdatedData.replace(/(#EXTM3U)/, '$1\n' + contentSteeringURI);
                    console.log('Final modified data length:', modifiedData.length);
                    console.log('Final data preview:', modifiedData.substring(0, 300) + '...');
                    
                    // Set headers and send response
                    res.set(proxyRes.headers);
                    // Update content-length to match new data length
                    res.set('content-length', modifiedData.length);
                    res.end(modifiedData);
                    console.log('Modified response sent');
                });
                
            }).on('error', (err) => {
                console.error('Request error:', err);
                res.statusCode = 500;
                res.end('Request failed: ' + err.message);
            });
            
        } catch (error) {
            console.error('Error:', error);
            res.statusCode = 500;
            res.end('Server error');
        }
    } else {
        // Handle other files with direct proxy
        console.log('Direct proxy for non-manifest file');
        const proxy = createProxyMiddleware({
            target: process.env.PROXY_TARGET,
            changeOrigin: true,
        });
        
        proxy(req, res);
    }
});

app.listen(8081, () => {
    console.log(`[PID:${processId}] MediaPackage proxy server running on port 8081`);
    console.log(`[PID:${processId}] Proxy target:`, process.env.PROXY_TARGET);
    console.log(`[PID:${processId}] Health check endpoint: http://localhost:8081/health`);
    console.log(`[PID:${processId}] JWT encode endpoint: http://localhost:8081/jwt/encode`);
    console.log(`[PID:${processId}] JWT generate endpoint: http://localhost:8081/jwt/generate`);
    console.log(`[PID:${processId}] Health checks will run every 60 seconds`);
});
