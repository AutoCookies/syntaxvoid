'use strict';

class SpriteAnimator {
    constructor({ imageUrl, frameWidth, frameHeight, frameCount, fps, scale = 2 }) {
        this.imageUrl = imageUrl;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frameCount = frameCount;
        this.fps = fps || 12;
        this.scale = scale;

        this.currentFrame = 0;
        this.lastFrameTime = 0;
        this.animationFrameId = null;

        this.orientation = 'horizontal'; // 'horizontal' | 'vertical'
        this._isReady = false;

        this.element = document.createElement('div');
        this.element.classList.add('agentSprite');

        const scaledWidth = this.frameWidth * this.scale;
        const scaledHeight = this.frameHeight * this.scale;

        this.element.style.width = `${scaledWidth}px`;
        this.element.style.height = `${scaledHeight}px`;
        this.element.style.display = 'block';
        this.element.style.imageRendering = 'pixelated';
        this.element.style.backgroundRepeat = 'no-repeat';
        this.element.style.backgroundPosition = '0px 0px';

        // DEFAULT: Assume horizontal strip immediately to prevent "tiny sprite" or "4-up" glitch
        // while waiting for image load.
        const sheetWidth = this.frameWidth * this.frameCount;
        const scaledSheetWidth = sheetWidth * this.scale;
        const scaledSheetHeight = this.frameHeight * this.scale;
        this.element.style.backgroundSize = `${scaledSheetWidth}px ${scaledSheetHeight}px`;

        const fileUrl = this._toFileUrl(this.imageUrl);
        this._applyBackgroundImage(fileUrl);
        this._detectAndApplySheetLayout(fileUrl);
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
        this.stop();
    }

    play() {
        if (this.animationFrameId) return;
        this.lastFrameTime = performance.now();
        this.loop();
    }

    loop() {
        this.animationFrameId = requestAnimationFrame((time) => {
            if (!this.animationFrameId) return;
            this.loop();

            const delta = time - this.lastFrameTime;
            const interval = 1000 / this.fps;

            if (delta > interval) {
                this.updateFrame();
                this.lastFrameTime = time - (delta % interval);
            }
        });
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    updateFrame() {
        // Fallback: render even if not ready if it takes too long (handled by timeout)
        if (!this._isReady) return;

        // If single frame, just ensure position is 0,0
        if (this.frameCount <= 1) {
            this.element.style.backgroundPosition = '0px 0px';
            return;
        }

        this.currentFrame = (this.currentFrame + 1) % this.frameCount;

        const scaledFrameWidth = this.frameWidth * this.scale;
        const scaledFrameHeight = this.frameHeight * this.scale;

        if (this.orientation === 'vertical') {
            const offsetY = -(this.currentFrame * scaledFrameHeight);
            this.element.style.backgroundPosition = `0px ${offsetY}px`;
        } else {
            const offsetX = -(this.currentFrame * scaledFrameWidth);
            this.element.style.backgroundPosition = `${offsetX}px 0px`;
        }
    }

    setImage(imageUrl, frameCount) {
        if (this.imageUrl === imageUrl && this.frameCount === frameCount) return;

        this.imageUrl = imageUrl;
        this.frameCount = frameCount;
        this.currentFrame = 0;
        this._isReady = false;

        const fileUrl = this._toFileUrl(this.imageUrl);
        this._applyBackgroundImage(fileUrl);
        this._detectAndApplySheetLayout(fileUrl);
    }

    _toFileUrl(pathOrUrl) {
        const raw = pathOrUrl.startsWith('file://') ? pathOrUrl : `file://${pathOrUrl}`;
        return this._safeCssUrl(raw);
    }

    _safeCssUrl(url) {
        // Encode spaces and other unsafe chars but keep file:// prefix
        if (url.startsWith('file://')) {
            const rest = url.slice('file://'.length);
            return `file://${encodeURI(rest)}`;
        }
        return encodeURI(url);
    }

    _applyBackgroundImage(fileUrl) {
        this.element.style.backgroundImage = `url('${fileUrl}')`;
    }

    _detectAndApplySheetLayout(fileUrl) {
        const img = new Image();

        // SAFETY: Force readiness if loading takes too long
        const safeTimer = setTimeout(() => {
            if (!this._isReady) {
                console.warn('[AgentIdentity] Image load timeout, forcing ready state.');
                this._applyBackgroundSize(); // Use current orientation default
                this._isReady = true;
            }
        }, 100); // 100ms timeout

        img.onload = () => {
            clearTimeout(safeTimer);
            const fw = this.frameWidth;
            const fh = this.frameHeight;

            const w = img.naturalWidth;
            const h = img.naturalHeight;

            // Detect orientation by matching expected strip shapes
            const isVertical =
                w === fw && h === fh * this.frameCount;

            const isHorizontal =
                h === fh && w === fw * this.frameCount;

            if (isVertical) this.orientation = 'vertical';
            else if (isHorizontal) this.orientation = 'horizontal';
            else {
                // Heuristic fallback: choose the axis that "fits" frameCount better
                const verticalFit = Math.abs(h / fh - this.frameCount);
                const horizontalFit = Math.abs(w / fw - this.frameCount);
                this.orientation = verticalFit <= horizontalFit ? 'vertical' : 'horizontal';
            }

            this._applyBackgroundSize();
            this.element.style.backgroundPosition = '0px 0px';
            this._isReady = true;
        };

        img.onerror = () => {
            clearTimeout(safeTimer);
            console.warn('[AgentIdentity] Image load error:', fileUrl);
            // Fail-safe: still render first frame
            this._applyBackgroundSize();
            this.element.style.backgroundPosition = '0px 0px';
            this._isReady = true;
        };

        img.src = fileUrl;
    }

    _applyBackgroundSize() {
        const scaledSheetWidth =
            (this.orientation === 'vertical'
                ? this.frameWidth
                : this.frameWidth * this.frameCount) * this.scale;

        const scaledSheetHeight =
            (this.orientation === 'vertical'
                ? this.frameHeight * this.frameCount
                : this.frameHeight) * this.scale;

        this.element.style.backgroundSize = `${scaledSheetWidth}px ${scaledSheetHeight}px`;
    }
}

module.exports = SpriteAnimator;
