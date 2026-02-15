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
        this.element.style.willChange = 'background-position, transform';

        this.timerId = null;

        this.frames = [];
        this.sheetSize = null;

        this.playback = {
            from: 0,
            to: 0,
            loop: true,
            direction: 'forward', // forward | pingpong
            cursor: 0,
            step: 1,
            running: false,
            onComplete: null,
        };

        this.loadToken = 0;
        this.loadedKey = null;

        this._load();
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.stop();
        if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
    }

    stop() {
        this.playback.running = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    setFacing(facing /* 'left' | 'right' */) {
        const scaleX = facing === 'left' ? -1 : 1;
        // NOTE: roaming-controller sẽ set translate3d trên wrapper element,
        // animator chỉ flip local sprite.
        this.element.style.transform = `scaleX(${scaleX})`;
    }

    async setAsset({ pngUrl, jsonUrl }) {
        const nextKey = `${pngUrl}::${jsonUrl}`;
        if (this.loadedKey === nextKey) return;

        this.stop();
        this.pngUrl = pngUrl;
        this.jsonUrl = jsonUrl;
        this.loadedKey = null;

        await this._load();
    }

    playLoopAll() {
        if (!this.frames.length) return;
        this._playRange({
            from: 0,
            to: this.frames.length - 1,
            loop: true,
            direction: 'forward',
            onComplete: null,
        });
    }

    playOnceAll(onComplete) {
        if (!this.frames.length) return;
        this._playRange({
            from: 0,
            to: this.frames.length - 1,
            loop: false,
            direction: 'forward',
            onComplete,
        });
    }

    playRange({ from, to, loop = true, direction = 'forward', onComplete = null }) {
        if (!this.frames.length) return;
        const safeFrom = Math.max(0, Math.min(this.frames.length - 1, from | 0));
        const safeTo = Math.max(0, Math.min(this.frames.length - 1, to | 0));
        this._playRange({
            from: Math.min(safeFrom, safeTo),
            to: Math.max(safeFrom, safeTo),
            loop,
            direction,
            onComplete,
        });
    }

    _playRange({ from, to, loop, direction, onComplete }) {
        this.stop();

        this.playback.from = from;
        this.playback.to = to;
        this.playback.loop = loop;
        this.playback.direction = direction;
        this.playback.onComplete = onComplete;

        this.playback.cursor = from;
        this.playback.step = 1;
        this.playback.running = true;

        this._renderFrame(this.playback.cursor);
        this._scheduleNext();
    }

    _scheduleNext() {
        if (!this.playback.running || !this.frames.length) return;

        const frame = this.frames[this.playback.cursor];
        const duration = frame?.duration ?? 100;

        this.timerId = setTimeout(() => {
            this._advance();
            if (!this.playback.running) return;
            this._renderFrame(this.playback.cursor);
            this._scheduleNext();
        }, duration);
    }

    _advance() {
        const pb = this.playback;
        const from = pb.from;
        const to = pb.to;

        if (from === to) {
            if (!pb.loop) this._complete();
            return;
        }

        if (pb.direction === 'pingpong') {
            const next = pb.cursor + pb.step;

            if (next > to) {
                pb.step = -1;
                pb.cursor = to - 1;
                if (pb.cursor < from) pb.cursor = from;
                return;
            }

            if (next < from) {
                if (!pb.loop) return this._complete();
                pb.step = 1;
                pb.cursor = from + 1;
                if (pb.cursor > to) pb.cursor = to;
                return;
            }

            pb.cursor = next;
            return;
        }

        // forward
        const next = pb.cursor + 1;
        if (next > to) {
            if (!pb.loop) return this._complete();
            pb.cursor = from;
            return;
        }
        pb.cursor = next;
    }

    _complete() {
        const cb = this.playback.onComplete;
        this.stop();
        if (typeof cb === 'function') cb();
    }

    _renderFrame(frameIndex) {
        const frame = this.frames[frameIndex];
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

    async _load() {
        const token = ++this.loadToken;

        try {
            const jsonPath = this._fileUrlToPath(this.jsonUrl);
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (token !== this.loadToken) return;

            this._parseData(data);

            this.element.style.backgroundImage = `url('${this._toCssUrl(this.pngUrl)}')`;

            this.loadedKey = `${this.pngUrl}::${this.jsonUrl}`;

            // default: loop all
            this.playLoopAll();
        } catch (error) {
            if (token !== this.loadToken) return;

            console.warn('[AgentIdentity] Failed to load aseprite assets:', this.jsonUrl, error);

            this.frames = [];
            this.sheetSize = null;

            this.element.style.width = `${16 * this.scale}px`;
            this.element.style.height = `${32 * this.scale}px`;
            this.element.style.backgroundImage = `url('${this._toCssUrl(this.pngUrl)}')`;
            this.element.style.backgroundPosition = '0 0';
        }
    }

    _parseData(data) {
        this.frames = [];

        if (Array.isArray(data.frames)) {
            this.frames = data.frames.map((f) => ({
                x: f.frame.x,
                y: f.frame.y,
                w: f.frame.w,
                h: f.frame.h,
                duration: f.duration,
            }));
        } else if (data.frames && typeof data.frames === 'object') {
            const keys = Object.keys(data.frames).sort();
            this.frames = keys.map((k) => {
                const f = data.frames[k];
                return { x: f.frame.x, y: f.frame.y, w: f.frame.w, h: f.frame.h, duration: f.duration };
            });
        }

        this.sheetSize = data?.meta?.size ?? null;
    }

    _fileUrlToPath(fileUrl) {
        if (fileUrl.startsWith('file://')) return decodeURI(fileUrl.slice(7));
        return fileUrl;
    }

    _toCssUrl(filePath) {
        let url = filePath;
        if (!url.startsWith('file://') && url.startsWith('/')) url = `file://${url}`;
        return encodeURI(url);
    }
}

module.exports = AsepriteAnimator;
