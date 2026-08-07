import { parseListingBody } from '../parseListingBody';

describe('parseListingBody', () => {
  it('parses numeric and boolean fields from strings', () => {
    const parsed = parseListingBody({
      title: 'Test product',
      price: '1999',
      stock: '3',
      freeShipping: 'true',
      allowPickup: 'false',
    });

    expect(parsed.title).toBe('Test product');
    expect(parsed.price).toBe(1999);
    expect(parsed.stock).toBe(3);
    expect(parsed.freeShipping).toBe(true);
    expect(parsed.allowPickup).toBe(false);
  });

  it('parses images JSON string', () => {
    const parsed = parseListingBody({
      images: JSON.stringify([{ url: 'https://example.com/a.jpg' }]),
    });

    expect(parsed.images).toEqual([{ url: 'https://example.com/a.jpg' }]);
  });

  it('parses removeImageKeys JSON string', () => {
    const parsed = parseListingBody({
      removeImageKeys: JSON.stringify(['img-1', 'img-2']),
    });

    expect(parsed.removeImageKeys).toEqual(['img-1', 'img-2']);
  });
});
