/** @type {import('next').NextConfig} */
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin'); // Default import

const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.join(__dirname, 'lib/tesseract/build/Release/tesseract_native.node'),
              to: path.join(__dirname, '.next/server'),
            },
          ],
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
