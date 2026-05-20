import { test, expect } from '@playwright/test';

test.describe('股票池页面测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3006/stock-pool');
  });

  test('页面加载正常', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('股票池');
    await expect(page.getByText('添加股票')).toBeVisible();
  });

  test('添加股票按钮打开弹窗', async ({ page }) => {
    await page.getByRole('button', { name: /添加股票/i }).click();
    await expect(page.getByRole('heading', { name: '添加股票' })).toBeVisible();
  });

  test('添加股票表单验证', async ({ page }) => {
    await page.getByRole('button', { name: /添加股票/i }).click();
    // 不填写内容直接点击保存
    await page.getByRole('button', { name: '添加股票' }).last().click();
    await expect(page.locator('.toast')).toContainText('请填写股票代码和名称');
  });

  test('成功添加股票', async ({ page }) => {
    await page.getByRole('button', { name: /添加股票/i }).click();
    await page.fill('input[placeholder="如 AAPL"]', 'TEST');
    await page.fill('input[placeholder="如 苹果公司"]', '测试股票');
    await page.getByRole('button', { name: '添加股票' }).last().click();
    await expect(page.locator('.toast')).toContainText('股票已添加');
  });

  test('删除股票功能', async ({ page }) => {
    // 先添加一个股票
    await page.getByRole('button', { name: /添加股票/i }).click();
    await page.fill('input[placeholder="如 AAPL"]', 'DELTEST');
    await page.fill('input[placeholder="如 苹果公司"]', '删除测试');
    await page.getByRole('button', { name: '添加股票' }).last().click();

    // 等待股票列表更新
    await page.waitForTimeout(500);

    // 找到删除按钮并点击
    const deleteButton = page.locator('.fa-trash').first();
    await deleteButton.click();
    await expect(page.locator('.toast')).toContainText('股票已删除');
  });

  test('Tab切换功能', async ({ page }) => {
    // 点击关注池 Tab
    await page.getByRole('button', { name: /关注池/i }).click();
    await expect(page.locator('.fa-trash').first()).toBeVisible();
  });

  test('编辑股票功能', async ({ page }) => {
    // 点击编辑按钮
    const editButton = page.locator('.fa-edit').first();
    await editButton.click();
    await expect(page.getByRole('heading', { name: '编辑股票' })).toBeVisible();
  });
});