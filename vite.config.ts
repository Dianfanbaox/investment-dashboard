/** WARNING: DON'T EDIT THIS FILE */
/** WARNING: DON'T EDIT THIS FILE */
/** WARNING: DON'T EDIT THIS FILE */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

function getPlugins() {
  const plugins = [react(), tsconfigPaths()];
  return plugins;
}

export default defineConfig({
  plugins: getPlugins(),
  server: {
    proxy: {
      '/siliconflow-api': {
        target: 'https://api.siliconflow.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/siliconflow-api/, ''),
      },
    },
  },
});
