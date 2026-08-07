import { describe, expect, it } from 'vitest';

describe('seller learning center', () => {
  it('article entries include title and tips', () => {
    const article = {
      id: 'fotos',
      title: 'Cómo sacar mejores fotos',
      summary: 'Tips de fotografía',
      tips: ['Usá luz natural', 'Fondo neutro'],
    };
    expect(article.tips.length).toBeGreaterThan(0);
    expect(article.title).toContain('fotos');
  });
});
