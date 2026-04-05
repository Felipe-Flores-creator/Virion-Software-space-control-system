import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    base: '/Virion-Software-space-control-system/',
    server: {
        port: 3000,
        host: true
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})