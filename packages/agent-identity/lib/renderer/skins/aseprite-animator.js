'use strict';

const fs = require('fs');

class AsepriteAnimator {
    constructor({ pngUrl, jsonUrl, scale = 2 }) {
        this.pngUrl = pngUrl;
        this.jsonUrl = jsonUrl;
        this.scale = scale;

        this.element = document.createElement('div');
        this.element.classList.add('agentSprite');
        this.element.style.display = 'block';
        this.element.style.imageRendering = 'pixelated';
        this.element.style.backgroundRepeat = 'no-repeat';

        this.timerId = null;
        this.frames = [];
        this.tags = {};
        this.currentTag = null;
        this.currentTagName = null;
        this.currentFrameIndex = 0;
        this.isPlaying = false;
        this.sheetSize = null;
        this.loadToken = 0;

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
        const token = ++this.loadToken;

        try {
            const jsonPath = this._fileUrlToPath(this.jsonUrl);
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (token !== this.loadToken) return;

            this._parseData(data);
            this.element.style.backgroundImage = `url('${this._toCssUrl(this.pngUrl)}')`;
            this.playTag(this.currentTagName || 'default');
        } catch (error) {
            if (token !== this.loadToken) return;
            console.warn('[AgentIdentity] Failed to load animation:', this.jsonUrl, error);
            this.frames = [];
            this.tags = {};
            this.sheetSize = null;
            this.element.style.width = '32px';
            this.element.style.height = '64px';
            this.element.style.backgroundImage = `url('${this._toCssUrl(this.pngUrl)}')`;
            this.element.style.backgroundPosition = '0 0';
        }
    }

    setAsset({ pngUrl, jsonUrl }) {
        if (this.pngUrl === pngUrl && this.jsonUrl === jsonUrl) return;

        this.stop();
        this.pngUrl = pngUrl;
        this.jsonUrl = jsonUrl;
        this.currentTag = null;
        this.currentTagName = null;
        this.currentFrameIndex = 0;
        this.load();
    }

    playTag(tagName) {
        if (this.frames.length === 0) return;

        const tag = this._resolveTag(tagName);
        if (!tag) return;

        const isTagChange = this.currentTagName !== tagName;
        this.currentTag = tag;
        this.currentTagName = tagName;

        if (isTagChange) {
            this.currentFrameIndex = tag.from;
            this.renderFrame();
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

        this.renderFrame();
        const frameData = this.frames[this.currentFrameIndex];
        const duration = frameData ? frameData.duration : 100;

        this.timerId = setTimeout(() => {
            this.advanceFrame();
            this.scheduleNextFrame();
        }, duration);
    }

    advanceFrame() {
        if (!this.currentTag) return;

        const { from, to } = this.currentTag;
        this.currentFrameIndex += 1;
        if (this.currentFrameIndex > to) {
            this.currentFrameIndex = from;
        }
    }

    renderFrame() {
        const frame = this.frames[this.currentFrameIndex];
        if (!frame) return;

        const scaledW = frame.w * this.scale;
        const scaledH = frame.h * this.scale;

        this.element.style.width = `${scaledW}px`;
        this.element.style.height = `${scaledH}px`;
        this.element.style.backgroundPosition = `${-(frame.x * this.scale)}px ${-(frame.y * this.scale)}px`;

        if (this.sheetSize) {
            this.element.style.backgroundSize = `${this.sheetSize.w * this.scale}px ${this.sheetSize.h * this.scale}px`;
        }
    }

    _resolveTag(tagName) {
        let tag = this.tags[tagName];
        if (tag) return tag;

        const tagNames = Object.keys(this.tags);
        if (tagNames.length > 0) {
            return this.tags[tagNames[0]];
        }

        if (this.frames.length > 0) {
            return { from: 0, to: this.frames.length - 1, direction: 'forward' };
        }

        return null;
    }

    _parseData(data) {
        this.frames = [];
        this.tags = {};

        if (Array.isArray(data.frames)) {
            this.frames = data.frames.map((frame) => ({
                x: frame.frame.x,
                y: frame.frame.y,
                w: frame.frame.w,
                h: frame.frame.h,
                duration: frame.duration
            }));
        } else if (data.frames && typeof data.frames === 'object') {
            const keys = Object.keys(data.frames).sort();
            this.frames = keys.map((key) => {
                const frame = data.frames[key];
                return {
                    x: frame.frame.x,
                    y: frame.frame.y,
                    w: frame.frame.w,
                    h: frame.frame.h,
                    duration: frame.duration
                };
            });
        }

        this.sheetSize = data.meta && data.meta.size ? data.meta.size : null;

        const frameTags = data.meta && Array.isArray(data.meta.frameTags) ? data.meta.frameTags : [];
        frameTags.forEach((tag) => {
            this.tags[tag.name] = {
                from: tag.from,
                to: tag.to,
                direction: tag.direction
            };
        });

        if (this.currentFrameIndex >= this.frames.length) {
            this.currentFrameIndex = 0;
        }
    }

    _fileUrlToPath(fileUrl) {
        if (fileUrl.startsWith('file://')) {
            return decodeURI(fileUrl.slice(7));
        }
        return fileUrl;
    }

    _toCssUrl(filePath) {
        let url = filePath;
        if (!url.startsWith('file://') && url.startsWith('/')) {
            url = `file://${url}`;
        }
        return encodeURI(url);
    }
}

module.exports = AsepriteAnimator;
