const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const metroResolver = require('metro-resolver');
const metroResolve =
  typeof metroResolver.resolve === 'function'
    ? metroResolver.resolve
    : metroResolver.default.resolve;

const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

/**
 * Metro 0.83+ enables `package.exports` by default. That can break RN Firebase’s
 * internal `./UtilsStatics.js` import inside `@react-native-firebase/app`.
 */
config.resolver.unstable_enablePackageExports = false;

const defaultResolveRequest = config.resolver.resolveRequest;

const utilsStaticsPath = path.join(
  projectRoot,
  'node_modules',
  '@react-native-firebase',
  'app',
  'dist',
  'module',
  'utils',
  'UtilsStatics.js',
);

/**
 * Explicit fallback: Metro sometimes still fails the relative `.js` subpath.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = String(context.originModulePath ?? '')
    .replace(/^file:\/\//, '')
    .replace(/\\/g, '/');

  const isRnfbUtils =
    origin.includes('@react-native-firebase/app') &&
    origin.includes('/dist/module/utils/');

  if (
    isRnfbUtils &&
    (moduleName === './UtilsStatics.js' || moduleName.endsWith('/UtilsStatics.js')) &&
    fs.existsSync(utilsStaticsPath)
  ) {
    return { type: 'sourceFile', filePath: utilsStaticsPath };
  }

  if (typeof defaultResolveRequest === 'function') {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return metroResolve(context, moduleName, platform);
};

module.exports = config;
