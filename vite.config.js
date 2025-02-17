import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'development' ? '/' : '/SC310006-Classroom-Management-System/',
  plugins: [
    react(), tailwindcss()
  ],
})
