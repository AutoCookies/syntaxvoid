'use strict';

const REQUIRED_PACKAGES = [
  'settings-view',
  'tree-view',
  'command-palette',
  'status-bar',
  'find-and-replace',
  'tabs',
  'pomai-project-map'
];

const OPTIONAL_DISABLED_BY_DEFAULT = [
  'exception-reporting',
  'pulsar-updater',
  'welcome',
  'background-tips',
  'about',
  'styleguide',
  'dev-live-reload'
];

module.exports = {
  REQUIRED_PACKAGES,
  OPTIONAL_DISABLED_BY_DEFAULT
};
