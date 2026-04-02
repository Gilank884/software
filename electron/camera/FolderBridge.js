import http from 'http';
import fs from 'fs';
import path from 'path';

/**
 * FolderBridge
 * Manages the Camera Hot Folder API (localhost:3001)
 */
export class FolderBridge {
  constructor(appRoot) {
    this.port = 3001;
    this.capturesDir = path.join(appRoot, 'captures');
    this.server = null;
    
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.capturesDir)) {
      fs.mkdirSync(this.capturesDir, { recursive: true });
    }
  }

  start() {
    this.server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://localhost:${this.port}`);
      const pathName = parsedUrl.pathname;

      console.log(`\x1b[34m[Camera Bridge]\x1b[0m ${req.method} ${req.url}`);

      // CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (pathName === '/status' || pathName === '/status/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', server: 'Latarcerita Camera Bridge (Auto)' }));
        return;
      }

      if (pathName === '/camera' || pathName === '/camera/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head>
              <title>Camera Monitor - Latarcerita</title>
              <style>
                body { font-family: sans-serif; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                .container { background: #1e293b; padding: 2rem; border-radius: 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; width: 100%; max-width: 800px; }
                img { max-width: 100%; border-radius: 1rem; border: 4px solid #334155; margin-top: 1rem; background: #000; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
                .status { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.5rem; }
                .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.7rem; font-weight: 800; background: #10b981; color: white; margin-bottom: 1rem; }
                .empty { padding: 4rem; color: #475569; font-weight: 800; border: 2px dashed #334155; border-radius: 1rem; margin-top: 1rem; }
                code { background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 0.3rem; color: #38bdf8; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="status">Hardware Monitor</div>
                <div id="badge" class="badge">Initializing...</div>
                <h1 style="margin: 0 0 1rem 0; font-size: 1.5rem;">DSLR Hot-Folder Preview</h1>
                <p style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 2rem;">
                  Monitoring project folder: <code>captures/</code>
                </p>
                <div id="preview-container">
                  <div class="empty">Waiting for camera...</div>
                </div>
                <p id="filename" style="font-size: 0.7rem; color: #64748b; margin-top: 1.5rem; font-family: monospace;"></p>
                <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #334155;">
                   <p style="font-size: 0.6rem; color: #475569;">Latarcerita Photobooth Camera Bridge v1.0</p>
                </div>
              </div>
              <script>
                console.log("[Monitor] Starting Camera Bridge Monitor...");
                const badge = document.getElementById('badge');
                const container = document.getElementById('preview-container');
                const filename = document.getElementById('filename');
                let lastFile = null;

                async function check() {
                  try {
                    const res = await fetch('/latest');
                    const data = await res.json();
                    
                    if (data.url) {
                      if (lastFile !== data.filename) {
                        console.log("[Monitor] New Photo Detected:", data.filename);
                        lastFile = data.filename;
                        container.innerHTML = '<img src="' + data.url + '" />';
                        filename.innerText = "LATEST FILE: " + data.filename;
                        badge.innerText = "CONNECTED & ACTIVE";
                        badge.style.background = "#10b981";
                      }
                    } else {
                      if (lastFile !== null || badge.innerText === "Initializing...") {
                        console.log("[Monitor] Folder is empty.");
                        lastFile = null;
                        container.innerHTML = '<div class="empty">No photos found in captures/ folder<br><br><span style="font-size: 0.7rem; font-weight: normal; font-family: sans-serif; color: #64748b;">Save a photo to the captures folder to see it here</span></div>';
                        filename.innerText = "";
                        badge.innerText = "CONNECTED (EMPTY FOLDER)";
                        badge.style.background = "#3b82f6";
                      }
                    }
                  } catch (err) {
                    console.error("[Monitor] Server unreachable:", err);
                    badge.innerText = "DISCONNECTED";
                    badge.style.background = "#ef4444";
                  }
                }

                setInterval(check, 1000);
                check();
              </script>
            </body>
          </html>
        `);
        return;
      }

      if (pathName === '/latest' || pathName === '/latest/') {
        const getFilesRecursively = (dir, fileList = []) => {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              getFilesRecursively(filePath, fileList);
            } else if (/\.(jpg|jpeg|png|gif)$/i.test(file)) {
              fileList.push(filePath);
            }
          });
          return fileList;
        };

        try {
          const allImages = getFilesRecursively(this.capturesDir);
          
          if (allImages.length === 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ url: null }));
            return;
          }

          const latest = allImages.map(filePath => ({
            path: filePath,
            name: path.basename(filePath),
            time: fs.statSync(filePath).mtime.getTime()
          }))
          .sort((a, b) => b.time - a.time)[0];

          const ext = path.extname(latest.path).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
          const base64 = fs.readFileSync(latest.path).toString('base64');
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            url: `data:${mime};base64,${base64}`,
            filename: latest.name
          }));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${pathName}. Valid endpoints are /status, /camera, and /latest.`);
    });

    this.server.listen(this.port, () => {
      console.log(`\x1b[32m[Camera Bridge]\x1b[0m Automated Hot Folder API running at http://localhost:${this.port}`);
    });

    this.server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.warn(`\x1b[33m[Camera Bridge]\x1b[0m Port ${this.port} in use. Bridge logic skipped.`);
      }
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}
