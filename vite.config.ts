import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages project site: https://gjwjdansnu-del.github.io/nozzle-game/
export default defineConfig({
  base: '/nozzle-game/',
  plugins: [react(), tailwindcss()],
})
