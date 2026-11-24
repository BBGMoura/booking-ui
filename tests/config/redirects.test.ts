import nextConfig from '../../next.config';

describe('redirects', () => {
  it('sends old Room rates bookmarks to Floor fees, permanently', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({
      source: '/admin/rates',
      destination: '/admin/floor-fees',
      permanent: true,
    });
  });
});
