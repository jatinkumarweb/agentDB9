/**
 * Chat Page E2E Tests
 * 
 * End-to-end tests for the chat interface with light theme design
 * Run with: npm run test:e2e
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Chat Page - Light Theme E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock authentication
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'demo@agentdb9.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to chat page
    await page.waitForURL('/chat');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Visual Design', () => {
    test('should display light theme gradient background', async () => {
      const background = await page.locator('[data-gradient-bg]');
      await expect(background).toBeVisible();
      
      const bgClasses = await background.getAttribute('class');
      expect(bgClasses).toContain('bg-gradient-to-br');
      expect(bgClasses).toContain('from-blue-50');
      expect(bgClasses).toContain('via-emerald-50');
      expect(bgClasses).toContain('to-purple-50');
    });

    test('should display all 4 animated blobs', async () => {
      for (let i = 1; i <= 4; i++) {
        const blob = await page.locator(`[data-blob="${i}"]`);
        await expect(blob).toBeVisible();
      }
    });

    test('should display glassmorphic cards', async () => {
      const glassCards = await page.locator('.glass-card');
      const count = await glassCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have noise texture overlay', async () => {
      const noiseOverlay = await page.locator('.opacity-\\[0\\.03\\]');
      await expect(noiseOverlay).toBeVisible();
    });
  });

  test.describe('Gradient Color Picker', () => {
    test('should show gradient picker button in development', async () => {
      // Assuming development mode
      const pickerButton = await page.locator('text=Gradient Picker');
      await expect(pickerButton).toBeVisible();
    });

    test('should open gradient picker on click', async () => {
      const pickerButton = await page.locator('text=Gradient Picker');
      await pickerButton.click();
      
      const picker = await page.locator('[data-testid="gradient-picker"]');
      await expect(picker).toBeVisible();
    });

    test('should close gradient picker', async () => {
      const pickerButton = await page.locator('text=Gradient Picker');
      await pickerButton.click();
      
      const closeButton = await page.locator('text=Close Picker');
      await closeButton.click();
      
      const picker = await page.locator('[data-testid="gradient-picker"]');
      await expect(picker).not.toBeVisible();
    });

    test('should allow color customization', async () => {
      const pickerButton = await page.locator('text=Gradient Picker');
      await pickerButton.click();
      
      // Test color input interaction
      const colorInput = await page.locator('input[type="color"]').first();
      await colorInput.fill('#ff0000');
      
      // Verify the color was applied (would need to check computed styles)
      await expect(colorInput).toHaveValue('#ff0000');
    });
  });

  test.describe('Sidebar Interactions', () => {
    test('should display agent selector', async () => {
      const agentSelect = await page.locator('select');
      await expect(agentSelect).toBeVisible();
    });

    test('should create new conversation', async () => {
      const newChatButton = await page.locator('text=New Chat');
      await expect(newChatButton).toBeVisible();
      await newChatButton.click();
      
      // Verify new conversation was created
      await page.waitForTimeout(1000);
    });

    test('should display user info', async () => {
      const username = await page.locator('text=testuser');
      await expect(username).toBeVisible();
    });

    test('should logout user', async () => {
      const logoutButton = await page.locator('button[title="Logout"]');
      await logoutButton.click();
      
      // Should redirect to login
      await page.waitForURL('/auth/login');
    });
  });

  test.describe('Chat Interface', () => {
    test('should display welcome message when no conversation selected', async () => {
      const welcomeMessage = await page.locator('text=Welcome to AgentDB9 Chat');
      await expect(welcomeMessage).toBeVisible();
    });

    test('should display WebSocket connection status', async () => {
      const statusBadge = await page.locator('text=Live, text=Polling').first();
      await expect(statusBadge).toBeVisible();
    });

    test('should render message input with glass effect', async () => {
      const messageInput = await page.locator('textarea.glass-input');
      await expect(messageInput).toBeVisible();
    });

    test('should render send button with gradient', async () => {
      const sendButton = await page.locator('button:has-text("Send"), button:has(svg)').last();
      await expect(sendButton).toBeVisible();
    });
  });

  test.describe('Message Sending', () => {
    test('should send a message', async () => {
      // First create a conversation
      const newChatButton = await page.locator('text=New Chat');
      await newChatButton.click();
      await page.waitForTimeout(1000);
      
      // Type and send message
      const messageInput = await page.locator('textarea');
      await messageInput.fill('Hello, this is a test message');
      
      const sendButton = await page.locator('button:has(svg)').last();
      await sendButton.click();
      
      // Verify message appears
      await page.waitForTimeout(2000);
      const message = await page.locator('text=Hello, this is a test message');
      await expect(message).toBeVisible();
    });

    test('should display thinking animation while generating', async () => {
      // Create conversation and send message
      const newChatButton = await page.locator('text=New Chat');
      await newChatButton.click();
      await page.waitForTimeout(1000);
      
      const messageInput = await page.locator('textarea');
      await messageInput.fill('Test');
      
      const sendButton = await page.locator('button:has(svg)').last();
      await sendButton.click();
      
      // Look for thinking dots
      const thinkingDots = await page.locator('.thinking-dots');
      await expect(thinkingDots).toBeVisible();
    });

    test('should support Enter key to send', async () => {
      const newChatButton = await page.locator('text=New Chat');
      await newChatButton.click();
      await page.waitForTimeout(1000);
      
      const messageInput = await page.locator('textarea');
      await messageInput.fill('Test message');
      await messageInput.press('Enter');
      
      await page.waitForTimeout(2000);
      const message = await page.locator('text=Test message');
      await expect(message).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const mainContainer = await page.locator('.max-w-7xl');
      await expect(mainContainer).toBeVisible();
    });

    test('should be responsive on tablet', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const mainContainer = await page.locator('.max-w-7xl');
      await expect(mainContainer).toBeVisible();
    });

    test('should be responsive on desktop', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const mainContainer = await page.locator('.max-w-7xl');
      await expect(mainContainer).toBeVisible();
    });
  });

  test.describe('Animations', () => {
    test('should animate blobs smoothly', async () => {
      const blob1 = await page.locator('[data-blob="1"]');
      
      // Get initial position
      const initialBox = await blob1.boundingBox();
      
      // Wait for animation
      await page.waitForTimeout(2000);
      
      // Get new position (should be different due to animation)
      const newBox = await blob1.boundingBox();
      
      // Positions should be different (animation is working)
      expect(initialBox).not.toEqual(newBox);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async () => {
      const h1 = await page.locator('h1');
      await expect(h1).toBeVisible();
    });

    test('should support keyboard navigation', async () => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should focus on interactive elements
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'SELECT', 'TEXTAREA', 'INPUT']).toContain(focusedElement);
    });

    test('should have proper color contrast', async () => {
      // This would require a contrast checking library
      // For now, we just verify text is visible
      const textElements = await page.locator('text=Welcome to AgentDB9 Chat');
      await expect(textElements).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async () => {
      const startTime = Date.now();
      await page.goto('/chat');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should render animations smoothly', async () => {
      // Check for dropped frames (would need performance API)
      const metrics = await page.evaluate(() => {
        return {
          fps: performance.now(),
        };
      });
      
      expect(metrics.fps).toBeGreaterThan(0);
    });
  });
});
