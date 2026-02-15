'use strict';

class MotionController {
    constructor(element) {
        this.element = element;
        this.motionLevel = atom.config.get('agent-identity.motionLevel') || 'subtle';
        this.status = 'idle';
        this.interval = null;
        this.time = 0;

        this.configSubscription = atom.config.observe('agent-identity.motionLevel', (val) => {
            this.motionLevel = val;
            this.reset();
        });
    }

    setStatus(status) {
        if (this.status === status) return;
        this.status = status;
        this.reset();

        if (this.status === 'error') {
            this.triggerShake();
        }
    }

    reset() {
        this.stopLoop();
        this.element.style.transform = 'translate3d(0, 0, 0)';
        this.time = 0;

        if (this.motionLevel === 'none') return;
        if (this.status === 'offline') return;

        this.startLoop();
    }

    startLoop() {
        const fps = this.motionLevel === 'playful' ? 30 : 10;
        const intervalMs = 1000 / fps;

        this.interval = setInterval(() => {
            this.update();
        }, intervalMs);
    }

    stopLoop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    update() {
        this.time += 0.1;
        let x = 0;
        let y = 0;

        switch (this.status) {
            case 'reviewing': // Tiny vertical breathing
                y = Math.sin(this.time) * 2;
                break;
            case 'planning': // Left-right sway
                x = Math.sin(this.time * 0.5) * 3;
                break;
            case 'executing': // Micro bounce
                y = Math.abs(Math.sin(this.time * 2)) * -2;
                break;
            case 'patching': // No movement
                break;
            default: // Idle - No movement
                break;
        }

        if (this.motionLevel === 'subtle') {
            // Clamp amplitude for subtle mode
            x = x * 0.5;
            y = y * 0.5;
        }

        this.element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }

    triggerShake() {
        // Run once
        const originalTransform = this.element.style.transform;
        this.element.classList.add('shake');

        setTimeout(() => {
            this.element.classList.remove('shake');
            this.element.style.transform = originalTransform;
        }, 300);
    }

    dispose() {
        this.stopLoop();
        this.configSubscription.dispose();
    }
}

module.exports = MotionController;
