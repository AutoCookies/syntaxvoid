(function () {
  console.log('[SyntaxVoid] Entry script starting...');
  // Define the window start time before the requires so we get a more accurate
  // window:start marker.
  const startWindowTime = Date.now();

  const electron = require('electron');
  const remote = require('@electron/remote');
  const path = require('path');
  const Module = require('module');
  const getWindowLoadSettings = require('../src/get-window-load-settings');
  const { getReleaseChannel } = require('../src/get-app-details.js');
  const StartupTime = require('../src/startup-time');
  const entryPointDirPath = __dirname;
  let blobStore = null;

  const startupMarkers = remote.getCurrentWindow().startupMarkers;

  if (startupMarkers) {
    StartupTime.importData(startupMarkers);
  }
  StartupTime.addMarker('window:start', startWindowTime);

  const start = async function () {
    console.log('[SyntaxVoid] Startup sequence initiated (ReadyState:', document.readyState, ')');
    try {
      StartupTime.addMarker('window:onload:start');
      const startTime = Date.now();

      console.log('[SyntaxVoid] Requiring second-mate...');
      await require('second-mate').ready;
      console.log('[SyntaxVoid] second-mate is ready.');

      process.on('unhandledRejection', function (error, promise) {
        console.error('Unhandled promise rejection:', error);
      });

      process.resourcesPath = path.normalize(process.resourcesPath);
      setupAtomHome();
      console.log('[SyntaxVoid] ATOM_HOME:', process.env.ATOM_HOME);

      const FileSystemBlobStore = require('../src/file-system-blob-store');
      blobStore = FileSystemBlobStore.load(path.join(process.env.ATOM_HOME, 'blob-store'));

      const NativeCompileCache = require('../src/native-compile-cache');
      NativeCompileCache.setCacheStore(blobStore);
      NativeCompileCache.setV8Version(process.versions.v8);
      NativeCompileCache.install();

      if (getWindowLoadSettings().profileStartup) {
        profileStartup(Date.now() - startTime);
      } else {
        StartupTime.addMarker('window:setup-window:start');
        console.log('[SyntaxVoid] Executing setupWindow...');
        setupWindow().then(() => {
          console.log('[SyntaxVoid] setupWindow completed. Sending window:loaded.');
          StartupTime.addMarker('window:setup-window:end');
          // Signal back to main process
          electron.ipcRenderer.send('window-command', 'window:loaded');
        }).catch(err => {
          console.error('[SyntaxVoid] setupWindow FAILED:', err);
        });
        setLoadTime(Date.now() - startTime);
      }
    } catch (error) {
      console.error('[SyntaxVoid] Error in startup sequence:', error);
      handleSetupError(error);
    }
    StartupTime.addMarker('window:onload:end');
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    start();
  } else {
    window.onload = start;
  }

  function setLoadTime(loadTime) {
    if (global.atom) {
      global.atom.loadTime = loadTime;
    }
  }

  function handleSetupError(error) {
    const currentWindow = remote.getCurrentWindow();
    currentWindow.setSize(800, 600);
    currentWindow.center();
    currentWindow.show();
    currentWindow.openDevTools();
    console.error(error.stack || error);
  }

  function setupWindow() {
    console.log('[SyntaxVoid] setupWindow: Starting...');
    const CompileCache = require('../src/compile-cache');
    console.log('[SyntaxVoid] setupWindow: CompileCache required');
    CompileCache.setAtomHomeDirectory(process.env.ATOM_HOME);
    console.log('[SyntaxVoid] setupWindow: AtomHome set');
    CompileCache.install(process.resourcesPath, require);
    console.log('[SyntaxVoid] setupWindow: CompileCache installed');

    const ModuleCache = require('../src/module-cache');
    console.log('[SyntaxVoid] setupWindow: ModuleCache required');
    ModuleCache.register(getWindowLoadSettings());
    console.log('[SyntaxVoid] setupWindow: ModuleCache registered');

    console.log('[SyntaxVoid] setupWindow: Requiring document-register-element...');
    require('document-register-element');
    console.log('[SyntaxVoid] setupWindow: document-register-element ready');

    const Grim = require('grim');
    const documentRegisterElement = document.registerElement;

    document.registerElement = (type, options) => {
      Grim.deprecate(
        'Use `customElements.define` instead of `document.registerElement` see https://javascript.info/custom-elements'
      );

      return documentRegisterElement(type, options);
    };
    console.log('[SyntaxVoid] setupWindow: Grim/document.registerElement patched');

    const { userSettings, appVersion } = getWindowLoadSettings();
    console.log('[SyntaxVoid] setupWindow: Settings retrieved');

    const CSON = require('season');
    console.log('[SyntaxVoid] setupWindow: Season required');
    CSON.setCacheDir(path.join(CompileCache.getCacheDirectory(), 'cson'));
    console.log('[SyntaxVoid] setupWindow: CSON cache dir set');

    const initScriptPath = path.relative(
      entryPointDirPath,
      getWindowLoadSettings().windowInitializationScript
    );
    console.log('[SyntaxVoid] setupWindow: initScriptPath calculated:', initScriptPath);

    console.log('[SyntaxVoid] setupWindow: Requiring initialize script...');
    const initialize = require(initScriptPath);
    console.log('[SyntaxVoid] setupWindow: Initialize script required');

    StartupTime.addMarker('window:initialize:start');

    console.log('[SyntaxVoid] setupWindow: Calling initialize()...');
    return initialize({ blobStore: blobStore }).then(function () {
      console.log('[SyntaxVoid] setupWindow: initialize() promise resolved');
      StartupTime.addMarker('window:initialize:end');
      electron.ipcRenderer.send('window-command', 'window:loaded');
    }).catch(err => {
      console.error('[SyntaxVoid] setupWindow: initialize() FAILED:', err);
      throw err;
    });
  }

  function profileStartup(initialTime) {
    function profile() {
      console.profile('startup');
      const startTime = Date.now();
      setupWindow().then(function () {
        setLoadTime(Date.now() - startTime + initialTime);
        console.profileEnd('startup');
        console.log(
          'Switch to the Profiles tab to view the created startup profile'
        );
      });
    }

    const webContents = remote.getCurrentWindow().webContents;
    if (webContents.devToolsWebContents) {
      profile();
    } else {
      webContents.once('devtools-opened', () => {
        setTimeout(profile, 1000);
      });
      webContents.openDevTools();
    }
  }

  function setupAtomHome() {
    if (process.env.ATOM_HOME) {
      return;
    }

    // Ensure ATOM_HOME is always set before anything else is required
    // This is because of a difference in Linux not inherited between browser and render processes
    // https://github.com/atom/atom/issues/5412
    if (getWindowLoadSettings() && getWindowLoadSettings().atomHome) {
      process.env.ATOM_HOME = getWindowLoadSettings().atomHome;
    }
  }
})();
