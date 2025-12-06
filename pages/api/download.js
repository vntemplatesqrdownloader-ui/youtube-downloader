// pages/api/download.js

import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, filename } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  try {
    console.log('🎥 Starting download from:', url.substring(0, 100) + '...');
    console.log('📁 Filename:', filename);

    // Fetch video stream from Google
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
      timeout: 0, // No timeout for large files
    });

    // Get content length if available
    const contentLength = response.headers['content-length'];
    
    console.log('✅ Stream received, content length:', contentLength || 'unknown');

    // Set response headers for download
    const fileExtension = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mp3': 'audio/mpeg',
      'm4a': 'audio/mp4',
    };

    const contentType = mimeTypes[fileExtension] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Track progress
    let downloadedBytes = 0;
    response.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (contentLength) {
        const progress = ((downloadedBytes / contentLength) * 100).toFixed(2);
        console.log(`⬇️  Progress: ${progress}%`);
      }
    });

    // Pipe the video stream directly to response
    response.data.pipe(res);

    // Handle completion
    response.data.on('end', () => {
      console.log('✅ Download completed successfully!');
    });

    // Handle errors in stream
    response.data.on('error', (err) => {
      console.error('❌ Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error occurred' });
      }
    });

  } catch (error) {
    console.error('❌ Download error:', error.message);
    
    if (!res.headersSent) {
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({ error: 'Request timeout' });
      }
      if (error.response?.status === 403) {
        return res.status(403).json({ error: 'Access forbidden - URL may have expired' });
      }
      return res.status(500).json({ 
        error: 'Download failed', 
        details: error.message 
      });
    }
  }
}

// Important: Configure Next.js to handle large responses
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Body parser limit
    },
    responseLimit: false, // Disable response limit for streaming
    externalResolver: true, // Tell Next.js this route handles its own response
  },
};