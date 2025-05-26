/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  async headers() {
    return [
      {
        // Allow Microsoft Teams to iframe the app
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors teams.microsoft.com *.teams.microsoft.com *.skype.com;",
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig; 