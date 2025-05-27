// config.js

const CONFIG = {
  "ZAPIER_WEBHOOK_URL": "YOUR_ZAPIER_WEBHOOK_URL",
  "DEBUG_MODE": false,
  "APP_NAME": "Profile To Affinity"
};

// Make it available in global scope for background scripts
self.CONFIG = CONFIG;
