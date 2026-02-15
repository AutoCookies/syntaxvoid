'use strict';

const fs = require('fs');

class AsepriteAnimator {
    constructor({ pngUrl, jsonUrl, scale = 2 }) {
        this.pngUrl = pngUrl;
        this.jsonUrl = jsonUrl;
        this.scale = scale;

        this.element = document.createElement('div');
        this.element.classList.add('agentSprite');

        // Initial invisible state until loaded
        this.element.style.display = 'block';
        this.element.style.imageRendering = 'pixelated';
        this.element.style.backgroundRepeat = 'no-repeat';

        // Timer for animation loop
        this.timerId = null;

        // State
        this.frames = [];
        this.tags = {};
        this.currentTag = null;
        this.currentFrameIndex = 0; // Global frame index in the 'frames' array
        this.isPlaying = false;

        this.load();
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.stop();
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    async load() {
        try {
            // 1. Load JSON
            // We can use fetch for local files in Electron renderer, or require/fs if node integration is enabled.
            // Since this is a renderer process with node integration:
            const jsonPath = this._fileUrlToPath(this.jsonUrl);
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

            this._parseData(data);

            // 2. Load Image
            const cssUrl = this._toCssUrl(this.pngUrl);
            this.element.style.backgroundImage = `url('${cssUrl}')`;

            // 3. Start Playing default tag or all frames
            this.playTag('default');

        } catch (err) {
            console.warn('[AgentIdentity] Failed to load animation:', this.jsonUrl, err);
            // Fail-safe: Try to render *something* if PNG exists, assuming a simple grid?
            // Or just show error state. For now, set a fallback size.
            this.element.style.width = '32px';
            this.element.style.height = '64px';
            const cssUrl = this._toCssUrl(this.pngUrl);
            this.element.style.backgroundImage = `url('${cssUrl}')`;
            this.element.style.backgroundPosition = '0 0';
        }
    }

    setAsset({ pngUrl, jsonUrl }) {
        if (this.pngUrl === pngUrl && this.jsonUrl === jsonUrl) return;

        this.stop();
        this.pngUrl = pngUrl;
        this.jsonUrl = jsonUrl;
        this.load();
    }

    playTag(tagName) {
        let tag = this.tags[tagName];

        if (!tag) {
            // Fallback to first available tag, or default 'all frames'
            const tagNames = Object.keys(this.tags);
            if (tagNames.length > 0) {
                tag = this.tags[tagNames[0]];
            } else {
                // Synthetic default tag spanning all frames
                tag = { from: 0, to: Math.max(0, this.frames.length - 1), direction: 'forward' };
            }
        }

        this.currentTag = tag;

        // If switching tags, reset to start of tag
        if (this.currentFrameIndex < tag.from || this.currentFrameIndex > tag.to) {
            this.currentFrameIndex = tag.from;
        }

        if (!this.isPlaying) {
            this.isPlaying = true;
            this.scheduleNextFrame();
        }
    }

    stop() {
        this.isPlaying = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    scheduleNextFrame() {
        if (!this.isPlaying || this.frames.length === 0) return;

        const frameData = this.frames[this.currentFrameIndex];
        const duration = frameData ? frameData.duration : 100;

        this.renderFrame();

        this.timerId = setTimeout(() => {
            this.advanceFrame();
            this.scheduleNextFrame();
        }, duration);
    }

    advanceFrame() {
        if (!this.currentTag) return;

        const { from, to, direction } = this.currentTag;

        // TODO: Handle 'reverse' or 'pingpong' if needed. 
        // For now, assume 'forward' loop.

        this.currentFrameIndex++;
        if (this.currentFrameIndex > to) {
            this.currentFrameIndex = from;
        }
    }

    renderFrame() {
        const frame = this.frames[this.currentFrameIndex];
        if (!frame) return;

        const { x, y, w, h } = frame;

        // Apply scaling
        const scaledW = w * this.scale;
        const scaledH = h * this.scale;

        this.element.style.width = `${scaledW}px`;
        this.element.style.height = `${scaledH}px`;

        const posX = -(x * this.scale);
        const posY = -(y * this.scale);

        // DEBUG LOG
        if (this.currentFrameIndex === 0) {
            console.log('[AgentIdentity] Rendering Frame 0:', {
                w, h, scale: this.scale,
                scaledW, scaledH, posX, posY,
                bgUrl: this.element.style.backgroundImage
            });
            this.element.style.border = '1px solid red'; // DEBUG BORDER
        }

        this.element.style.backgroundPosition = `${posX}px ${posY}px`;

        // Update background size based on sheet dimensions? 
        // We need the total sheet size. Assuming simple approach:
        // We rely on 'background-position' indexing into the full image.
        // But 'background-size' usually needs to be set if we are scaling the image.
        // Aseprite JSON 'meta.size' gives us full sheet size.

        if (this.sheetSize) {
            const sheetW = this.sheetSize.w * this.scale;
            const sheetH = this.sheetSize.h * this.scale;
            this.element.style.backgroundSize = `${sheetW}px ${sheetH}px`;
        }
    }

    _parseData(data) {
        // Normalization
        this.frames = [];
        this.tags = {};

        // Frames
        if (Array.isArray(data.frames)) {
            // Array format
            console.log('[AgentIdentity] Parsing Array Frames:', data.frames.length);
            this.frames = data.frames.map(f => ({
                x: f.frame.x,
                y: f.frame.y,
                w: f.frame.w,
                h: f.frame.h,
                duration: f.duration
            }));
        } else if (typeof data.frames === 'object') {
            // Hash format
            const keys = Object.keys(data.frames).sort();
            console.log('[AgentIdentity] Parsing Hash Frames:', keys.length);
            this.frames = keys.map(k => {
                const f = data.frames[k];
                return {
                    x: f.frame.x,
                    y: f.frame.y,
                    w: f.frame.w,
                    h: f.frame.h,
                    duration: f.duration
                };
            });
        }
        console.log('[AgentIdentity] Total Frames:', this.frames.length);

        // Meta
        if (data.meta) {
            this.sheetSize = data.meta.size; // {w, h}

            if (Array.isArray(data.meta.frameTags)) {
                data.meta.frameTags.forEach(tag => {
                    this.tags[tag.name] = {
                        from: tag.from,
                        to: tag.to,
                        direction: tag.direction
                    };
                });
            }
        }
    }

    _fileUrlToPath(fileUrl) {
        if (fileUrl.startsWith('file://')) {
            return decodeURI(fileUrl.slice(7));
        }
        return fileUrl;
    }

    _toCssUrl(path) {
        let url = path;
        if (!url.startsWith('file://')) {
            // Ensure absolute paths get file protocol
            if (path.startsWith('/')) {
                url = `file://${path}`;
            }
        }
        // Encode spaces and special chars
        return encodeURI(url);
    }
}

module.exports = AsepriteAnimator;
