import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import {viteStaticCopy} from 'vite-plugin-static-copy';
// From `vitest/config`, not `vite` — vite's own `defineConfig` has no `test` key and
// rejects the block below at type-check time.
import {defineConfig} from 'vitest/config';

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		viteStaticCopy({
			// Azure Static Web Apps reads this from the build output, not the repo root.
			targets: [{src: 'staticwebapp.config.json', dest: '.'}]
		})
	],
	build: {
		// `build`, not `dist` — matching the frontend template. The SWA workflow's
		// `output_location` is set to match (conflict C-7); it is a workflow input, not
		// a fixed value, and changing the directory here would break the static copy above.
		outDir: 'build',
		chunkSizeWarningLimit: 600
	},
	resolve: {
		alias: {'@': path.resolve(__dirname, './src')}
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: './src/test/setup.ts'
	}
});
