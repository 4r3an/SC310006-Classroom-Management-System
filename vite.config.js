import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/SC310006-Classroom-Management-System/',
  plugins: [
    react(),
    tailwindcss()
  ],
})