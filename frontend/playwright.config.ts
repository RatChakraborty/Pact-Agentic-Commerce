import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',use:{launchOptions:process.env.PACT_CHROMIUM_PATH?{executablePath:process.env.PACT_CHROMIUM_PATH}:undefined,baseURL:process.env.PACT_TEST_URL||'http://127.0.0.1:8000'},workers:1,reporter:'list'});
