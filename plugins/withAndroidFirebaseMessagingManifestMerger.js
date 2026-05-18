/**
 * Resolves manifest merger conflicts between expo-notifications and
 * @react-native-firebase/messaging (same com.google.firebase.messaging.* meta-data keys).
 * @see https://github.com/invertase/react-native-firebase/issues/8165
 *
 * Register this plugin in app.json BEFORE "expo-notifications". Expo runs the last-registered
 * manifest mod first; we must run after expo-notifications injects meta-data so tools:replace is applied.
 */
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/** android:name → tools:replace attribute list */
const META_DATA_REPLACE = {
  'com.google.firebase.messaging.default_notification_color': 'android:resource',
  'com.google.firebase.messaging.default_notification_icon': 'android:resource',
  'com.google.firebase.messaging.default_notification_channel_id': 'android:value',
};

function withAndroidFirebaseMessagingManifestMerger(config) {
  return withAndroidManifest(config, (config) => {
    AndroidConfig.Manifest.ensureToolsAvailable(config.modResults);
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const rawMeta = app['meta-data'];
    const items = Array.isArray(rawMeta) ? rawMeta : rawMeta ? [rawMeta] : [];
    for (const item of items) {
      const name = item?.$?.['android:name'];
      if (!name || !Object.prototype.hasOwnProperty.call(META_DATA_REPLACE, name)) {
        continue;
      }
      const replace = META_DATA_REPLACE[name];
      const existing = item.$['tools:replace'];
      if (existing) {
        const merged = new Set(String(existing).split(',').map((s) => s.trim()));
        merged.add(replace);
        item.$['tools:replace'] = [...merged].join(',');
      } else {
        item.$['tools:replace'] = replace;
      }
    }
    return config;
  });
}

module.exports = function withPlugin(config) {
  return withAndroidFirebaseMessagingManifestMerger(config);
};
