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
        headers: [          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://teams.microsoft.com teams.microsoft.com *.teams.microsoft.com *.skype.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://statics.teams.cdn.office.net https://*.microsoft.com;",
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig; 