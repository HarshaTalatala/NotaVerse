import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  // Force Vite to look in this exact directory for .env files
  const envDir = path.resolve(__dirname);
  const env = loadEnv(mode, envDir, 'VITE_');
  
  // Debug logging to see what's actually loaded
  console.log('[vite] Loading env from:', envDir);
  console.log('[vite] Mode:', mode);
  console.log('[vite] Loaded VITE_ keys:', Object.keys(env));
  
  // Prepare explicit define mappings (only VITE_ keys we actually rely on)
  const define: Record<string, string> = {};
  for (const k of Object.keys(env)) {
    define[`import.meta.env.${k}`] = JSON.stringify(env[k]);
  }
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      headers: {
        // Set Cross-Origin-Opener-Policy to allow OAuth popups
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        // Set Cross-Origin-Embedder-Policy for better security
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          timeout: 30000,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('❌ Proxy error - is Vercel dev server running on port 3001?', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('🔄 Proxying:', req.method, req.url, '→', proxyReq.protocol + '//' + proxyReq.getHeader('host') + proxyReq.path);
            });
          }
        }
      }
    },
    build: {
      outDir: 'dist'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    define,
    envDir
  };
});


