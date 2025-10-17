// https://6180c994cb835402.mediapackage.eu-west-1.amazonaws.com/out/v1/1ddf1ec05c0b4585bcf3df2a40d5ffdf/index.m3u8

const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { Transform } = require('stream');

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

// Handle all requests
app.use(async (req, res, next) => {
    console.log('Request Path', req.path);
    
    if (req.path.match(/\.(m3u8|mpd)$/)) {
        console.log('Processing manifest file');
        
        try {
            // Make direct request to MediaPackage
            const https = require('https');
            const targetUrl = 'https://6180c994cb835402.mediapackage.eu-west-1.amazonaws.com' + req.path;
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
            target: 'https://6180c994cb835402.mediapackage.eu-west-1.amazonaws.com',
            changeOrigin: true,
        });
        
        proxy(req, res);
    }
});

app.listen(8081, () => {
    console.log('MediaPackage proxy server running on port 8081');
    console.log('Proxy target: https://6180c994cb835402.mediapackage.eu-west-1.amazonaws.com');
});
