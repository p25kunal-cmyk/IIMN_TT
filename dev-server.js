#!/usr/bin/env node
// Minimal local dev server for netlify-app
// Serves static files + proxies /api/timetable to Google Apps Script

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const ROOT = __dirname;
// MUST include ?action=data so Apps Script returns JSON instead of its HTML page
const EXEC_URL = 'https://script.google.com/macros/s/AKfycbynFmcsk5S2ImeQEphSdfsonAHpeMrh1MtXOqP7D72DLOJGLPKMPz_XvAxCkfJEQtsgMQ/exec?action=data';

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

async function proxyTimetable(res) {
  try {
    const response = await fetch(EXEC_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*'
      },
      redirect: 'follow'
    });

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'auth', message: 'Apps Script requires authentication. Make sure deployment is set to "Anyone" access.' }));
      return;
    }

    const text = await response.text();
    
    // Validate JSON
    try {
      JSON.parse(text);
    } catch(e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_response', raw: text.slice(0, 200) }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(text);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'proxy_error', message: err.message }));
  }
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // API proxy
  if (url === '/api/timetable') return proxyTimetable(res);

  // Static files
  let filePath = path.join(ROOT, url === '/' ? 'index.html' : url);
  const ext = path.extname(filePath);

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // Fallback to index.html (SPA)
      filePath = path.join(ROOT, 'index.html');
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │                                         │');
  console.log('  │   IIMN Timetable - Local Dev Server     │');
  console.log('  │                                         │');
  console.log(`  │   http://localhost:${PORT}               │`);
  console.log('  │                                         │');
  console.log('  └─────────────────────────────────────────┘');
  console.log('');
  console.log('  Static files: served from', ROOT);
  console.log('  /api/timetable: proxied to Google Apps Script');
  console.log('');
});
