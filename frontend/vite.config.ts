import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    // Vite automatically picks up VITE_ variables from the loaded env
    // when envDir is set.
    envDir: path.resolve(__dirname, '../shared'),
  }
})
