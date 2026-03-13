const UpdateManager = require('../lib/update-manager');

describe('UpdateManager', () => {
  let updateManager;

  beforeEach(() => {
    updateManager = new UpdateManager();
  });

  describe('::getReleaseNotesURLForVersion', () => {
    it('returns the page for the release even when a dev version', () => {
      expect(updateManager.getReleaseNotesURLForVersion('1.100.0-dev')).toBe(
        'https://github.com/syntaxvoid-edit/syntaxvoid/releases/tag/v1.100.0-dev'
      );
    });

    it('returns the page for the release when a rolling ("nightly") release version', () => {
      expect(updateManager.getReleaseNotesURLForVersion('1.108.2023090322')).toBe(
        'https://github.com/syntaxvoid-edit/syntaxvoid/releases/tag/v1.108.2023090322'
      );
    });

    it('returns the page for the release when not a dev version', () => {
      expect(updateManager.getReleaseNotesURLForVersion('1.129.0')).toBe(
        'https://github.com/syntaxvoid-edit/syntaxvoid/releases/tag/v1.129.0'
      );
      expect(updateManager.getReleaseNotesURLForVersion('v1.100.0')).toBe(
        'https://github.com/syntaxvoid-edit/syntaxvoid/releases/tag/v1.100.0'
      );
    });
  });
});
