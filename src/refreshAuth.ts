// This script refreshes the authentication session for the waarnemingen.be website.

import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

export async function refreshAuth() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        locale: 'en-US',
    });
    const page = await context.newPage();

    await page.goto('https://waarnemingen.be/accounts/login/', {
        waitUntil: 'domcontentloaded',
    });

    // Wait for the login form to render
    await page.waitForSelector('#id_login');

    // Fill in credentials
    await page.fill('#id_login', process.env.USERNAME!);
    await page.fill('#id_password', process.env.PASSWORD!);

    // Wait for the login button to be visible and enabled
    const loginButton = page.getByRole('button', { name: 'Log in' });
    await loginButton.waitFor({ state: 'visible' });

    await Promise.all([
        page.waitForURL(url => !url.pathname.includes('/login')),
        loginButton.click(),
    ]);

    // Save new session
    await context.storageState({ path: 'auth.json' });
    await browser.close();
    console.log('✅ New auth.json saved.');
}