import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    port: 3000,
    hmr: false,
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react') || id.includes('lucide')) {
              return 'vendor-icons';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
            if (id.includes('@google/genai') || id.includes('@google/generative-ai')) {
              return 'vendor-ai';
            }
          }
          if (id.includes('src/components/CommandBar')) {
            return 'ui-commandbar';
          }
          if (id.includes('src/components/TacticalCard')) {
            return 'ui-tactical';
          }
        }
      }
    }
  }
});
