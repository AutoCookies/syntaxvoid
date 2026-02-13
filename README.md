<br>

<div align="center">

<img src="resources/pomai.png" alt="Pomai logo" width="260" />

# Pomai

*A community-led, hyper-hackable text editor,*
*forked from [Atom], built on [Electron].*

</div>

## About

Pomai is a rebranded codebase focused on the same customizable editor experience with a refreshed identity.

## Run Pomai locally

### Prerequisites

Before you begin, you need to set up your development environment. This project relies on **Node.js**, **Yarn**, and several **native libraries** for linux integration.

#### 1. Node.js & Yarn
- **Node.js**: verified with **v22.22.0**.
  - To check your version: `node -v`
- **Yarn**: The package manager used for this project.
  - Install globally: `npm install -g yarn`
  - Verify installation: `yarn --version`

#### 2. Native Build Tools (Linux/Ubuntu/Debian)
You need C++ compilers, Python, and specific libraries to build the native modules (like keyboard mappings and system integration).

**Run this command to install all required packages:**

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3 pkg-config libwayland-dev libx11-dev libxkbfile-dev libsecret-1-dev libxkbcommon-dev
```

**What are these?**
- `build-essential`: GCC/G++ compilers for building C++ code.
- `python3`: Required by `node-gyp` to build native Node modules.
- `pkg-config`: Helper tool used during the build to find library paths.
- `libwayland-dev`: Development files for the Wayland display server protocol.
- `libx11-dev`: Development files for the X11 windowing system.
- `libxkbfile-dev`: Library for parsing XKB keyboard description files.
- `libsecret-1-dev`: Library for accessing the Secret Service API (storing passwords).
- `libxkbcommon-dev`: Library to handle keyboard descriptions.


### One-Step Build & Run (Recommended)

We have provided a helper script that checks for dependencies, installs them, builds the project, and runs it.

```bash
chmod +x verified_build.sh
./verified_build.sh
```

### Manual Build Steps

1. **Install dependencies**:
   ```bash
   yarn install
   ```

2. **Build the project**:
   ```bash
   yarn build
   ```

3. **Build APM (Atom Package Manager)**:
   ```bash
   yarn build:apm
   ```

4. **Start the editor**:
   ```bash
   # Use the wrapper script for best results
   ./pomai.sh
   # Or directly via yarn
   yarn start
   ```

### Troubleshooting

- **Missing `wayland-client.h` or `xkbcommon.h`**: Ensure you have installed `libwayland-dev` and `libxkbcommon-dev`.
- **Node Version Warnings**: You may see warnings about the Node version. These can typically be ignored if the build completes successfully.


## Docs

- Developer docs: [docs/README.md](docs/README.md)
- Build docs: [docs/Building.md](docs/Building.md)

## License

Licensed under [MIT](LICENSE.md).

[Electron]: https://github.com/electron/electron
[Atom]: https://github.blog/2022-06-08-sunsetting-atom/
