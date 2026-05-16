module.exports = require('openmrs/default-webpack-config');
const config = module.exports;
config.devServer = {
  ...config.devServer,
  host: '0.0.0.0',
  allowedHosts: 'all',
};
