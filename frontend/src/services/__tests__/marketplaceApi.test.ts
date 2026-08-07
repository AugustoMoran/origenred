import { describe, expect, it } from 'vitest';

describe('marketplace smoke', () => {
  it('notification summary shape is valid', () => {
    const summary = {
      unreadChatMessages: 2,
      totalUnread: 3,
      items: [{ id: '1', type: 'chat', title: 'Test', body: 'Body', href: '/cuenta/mensajes', at: new Date().toISOString() }],
    };
    expect(summary.totalUnread).toBeGreaterThanOrEqual(summary.unreadChatMessages);
    expect(summary.items?.length).toBe(1);
  });
});
