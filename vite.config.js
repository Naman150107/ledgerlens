import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { pathToFileURL } from 'url'

// A simple middleware to route /api/extract to our serverless function during local vite dev!
const apiPlugin = () => ({
  name: 'api-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/api/extract') && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const parsedBody = body ? JSON.parse(body) : {};
              const mockReq = {
                method: 'POST',
                body: parsedBody,
                headers: req.headers
              };
              const mockRes = {
                headers: {},
                setHeader(name, value) {
                  this.headers[name] = value;
                },
                status(code) {
                  this.statusCode = code;
                  return this;
                },
                json(data) {
                  res.writeHead(this.statusCode || 200, {
                    'Content-Type': 'application/json',
                    ...this.headers
                  });
                  res.end(JSON.stringify(data));
                },
                end(data) {
                  res.writeHead(this.statusCode || 200, this.headers);
                  res.end(data);
                }
              };
              
              // Load the exact API handler file dynamically using a file:// URL (crucial for Windows path compatibility)
              const apiFilePath = path.resolve(process.cwd(), 'api/extract.js');
              const { default: handler } = await import(pathToFileURL(apiFilePath).href);
              await handler(mockReq, mockRes);
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Middleware API execution error', details: err.message }));
            }
          });
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Server middleware error', details: error.message }));
        }
      } else {
        next();
      }
    });
  }
})

export default defineConfig(({ mode }) => {
  // Load env from current directory and parent directory (to handle workspace root .env.local)
  const envLocal = loadEnv(mode, process.cwd(), '');
  const parentEnv = loadEnv(mode, path.resolve(process.cwd(), '..'), '');

  // Consolidate API keys into process.env so Node can find them in the serverless functions
  const apiKey = envLocal.GEMINI_API_KEY || parentEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (apiKey) {
    process.env.GEMINI_API_KEY = apiKey.trim();
  }

  const supabaseUrl = envLocal.VITE_SUPABASE_URL || parentEnv.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = envLocal.VITE_SUPABASE_ANON_KEY || parentEnv.VITE_SUPABASE_ANON_KEY || "";
  
  if (supabaseUrl) process.env.VITE_SUPABASE_URL = supabaseUrl.trim();
  if (supabaseAnonKey) process.env.VITE_SUPABASE_ANON_KEY = supabaseAnonKey.trim();

  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    server: {
      host: true
    }
  }
})