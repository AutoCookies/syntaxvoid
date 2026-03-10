const remote = require('@electron/remote');

let windowLoadSettings = null;

module.exports = () => {
  if (!windowLoadSettings) {
    // Embedded in Cheesecrab: preload sets window.loadSettingsJSON
    const raw = typeof window.loadSettingsJSON !== 'undefined'
      ? window.loadSettingsJSON
      : remote.getCurrentWindow().loadSettingsJSON;
    windowLoadSettings = JSON.parse(raw);
  }
  return windowLoadSettings;
};
