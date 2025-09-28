import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
	plugins: [react()],
	server: {
		port: 5174
	},
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
		sourcemap: false,
		minify: 'esbuild'
	},
	base: command === 'build' ? '/admin/' : '/'
})) 