'use strict';

class MotionController {
    constructor({ movementElement, flipElement, shellElement }) {
        this.movementElement = movementElement;
        this.flipElement = flipElement;
        this.shellElement = shellElement;

        this.status = 'idle';
        this.intensity = 0;
        this.motionLevel = atom.config.get('agent-identity.motionLevel') || 'subtle';
        this.directionMode = atom.config.get('agent-identity.directionMode') || 'flip';
        this.debugMotion = Boolean(atom.config.get('agent-identity.debugMotion'));

        this.anchor = { x: 24, y: -24 };
        this.zone = { width: 24, height: 10 };

        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this.facing = 'right';
        this.speed = 0;

        this.interval = null;
        this.lastTick = 0;
        this.phase = Math.random() * Math.PI * 2;
        this.errorImpulseUntil = 0;
        this.lastDebugLogAt = 0;
        this.consecutiveFacingTicks = { left: 0, right: 0 };
        this.isDisposed = false;

        this.configSubscriptions = [
            atom.config.observe('agent-identity.motionLevel', (val) => {
                this.motionLevel = val || 'subtle';
                this._applyZone();
                this.stop();
                this.start();
                if (this.motionLevel === 'none') {
                    this._resetKinematics();
                }
            }),
            atom.config.observe('agent-identity.directionMode', (val) => {
                this.directionMode = val || 'flip';
                this.apply();
            }),
            atom.config.observe('agent-identity.debugMotion', (val) => {
                this.debugMotion = Boolean(val);
                this._setDebugOutline(this.debugMotion);
            })
        ];

        this._applyZone();
        this.start();
    }

    onPresence(snapshot) {
        if (!snapshot) return;

        const prevStatus = this.status;
        this.status = snapshot.status || 'idle';
        this.intensity = Number.isFinite(snapshot.intensity) ? this._clamp(snapshot.intensity, 0, 1) : 0;

        if (this.status === 'error' && prevStatus !== 'error') {
            this.triggerShake();
            this.errorImpulseUntil = Date.now() + 260;
        }

        this._applyZone();
        if (this.motionLevel === 'none' || this.status === 'offline') {
            this._resetKinematics();
        }
    }

    start() {
        if (this.interval || this.isDisposed) return;

        const tickMs = this.motionLevel === 'playful' ? 33 : 50;
        this.lastTick = Date.now();
        this.interval = setInterval(() => {
            this.tick();
        }, tickMs);
    }

    stop() {
        if (!this.interval) return;
        clearInterval(this.interval);
        this.interval = null;
    }

    tick() {
        const now = Date.now();
        const dtMs = Math.max(16, Math.min(120, now - this.lastTick));
        this.lastTick = now;
        const dt = dtMs / 16.6667;

        if (this.motionLevel === 'none' || this.status === 'offline') {
            this.speed = 0;
            this.apply();
            return;
        }

        this.phase += (dtMs / 1000) * (this.motionLevel === 'playful' ? 1.8 : 1.2);

        this._updateTarget(now);

        const physics = this._getPhysics();
        this.velocity.x += (this.target.x - this.position.x) * physics.stiffness * dt;
        this.velocity.y += (this.target.y - this.position.y) * physics.stiffness * dt;

        this.velocity.x *= Math.pow(physics.damping, dt);
        this.velocity.y *= Math.pow(physics.damping, dt);

        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        this._clampPosition();

        this.speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y) / dtMs;
        this._updateFacing(dtMs);
        this.apply();
        this._debugLog(now);
    }

    apply() {
        if (!this.movementElement) return;

        const tx = this.anchor.x + this.position.x;
        const ty = this.anchor.y + this.position.y;
        this.movementElement.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;

        if (this.flipElement) {
            const shouldFlip = this.directionMode === 'flip' && this.facing === 'left';
            this.flipElement.classList.toggle('is-facing-left', shouldFlip);
        }
    }

    getFacing() {
        return this.facing;
    }

    getSpeed() {
        return this.speed;
    }

    triggerShake() {
        if (!this.shellElement) return;
        this.shellElement.classList.remove('shake');
        void this.shellElement.offsetWidth;
        this.shellElement.classList.add('shake');
        setTimeout(() => {
            if (this.shellElement) {
                this.shellElement.classList.remove('shake');
            }
        }, 250);
    }

    dispose() {
        this.isDisposed = true;
        this.stop();
        this.configSubscriptions.forEach((subscription) => {
            if (subscription && typeof subscription.dispose === 'function') {
                subscription.dispose();
            }
        });
        this.configSubscriptions = [];
    }

    _getPhysics() {
        const intensityBoost = this.intensity * 0.08;
        if (this.motionLevel === 'playful') {
            return { stiffness: 0.14 + intensityBoost, damping: 0.82 };
        }
        return { stiffness: 0.11 + intensityBoost, damping: 0.86 };
    }

    _updateTarget(now) {
        const playful = this.motionLevel === 'playful';
        const energy = this.intensity + (playful ? 0.2 : 0);
        let tx = 0;
        let ty = 0;

        switch (this.status) {
            case 'reviewing': {
                const amplitudeX = playful ? 10 : 4;
                const amplitudeY = playful ? 1.8 : 1;
                tx = Math.sin(this.phase * 0.75) * amplitudeX * (0.4 + energy);
                ty = Math.cos(this.phase * 1.1) * amplitudeY;
                break;
            }
            case 'executing': {
                const amplitudeX = playful ? 20 : 8;
                const amplitudeY = playful ? 3.5 : 2;
                tx = Math.sin(this.phase * 1.25) * amplitudeX * (0.45 + energy);
                ty = Math.abs(Math.sin(this.phase * 2.4)) * -amplitudeY;
                break;
            }
            case 'planning':
                tx = 0;
                ty = Math.sin(this.phase * 0.8) * (playful ? 1.2 : 0.8);
                break;
            case 'patching':
                tx = Math.sin(this.phase * 0.6) * (playful ? 1.4 : 0.7);
                ty = Math.cos(this.phase * 0.9) * (playful ? 0.9 : 0.5);
                break;
            case 'error':
                tx = Math.sin(this.phase * 10) * 2;
                ty = 0;
                break;
            default:
                tx = 0;
                ty = Math.sin(this.phase * 1.4) * (playful ? 1.4 : 0.8);
                break;
        }

        if (now < this.errorImpulseUntil) {
            tx += (Math.random() - 0.5) * 3;
        }

        this.target.x = tx;
        this.target.y = ty;
    }

    _updateFacing(dtMs) {
        const movementStatus = this.status === 'reviewing' || this.status === 'executing';
        if (!movementStatus) return;

        const threshold = this.motionLevel === 'playful' ? 0.2 : 0.16;
        const vxPxPerMs = this.velocity.x / dtMs;

        if (vxPxPerMs > threshold) {
            this.consecutiveFacingTicks.right += 1;
            this.consecutiveFacingTicks.left = 0;
        } else if (vxPxPerMs < -threshold) {
            this.consecutiveFacingTicks.left += 1;
            this.consecutiveFacingTicks.right = 0;
        } else {
            this.consecutiveFacingTicks.left = 0;
            this.consecutiveFacingTicks.right = 0;
            return;
        }

        if (this.consecutiveFacingTicks.right >= 2 && this.facing !== 'right') {
            this.facing = 'right';
            this.consecutiveFacingTicks.right = 0;
        }

        if (this.consecutiveFacingTicks.left >= 2 && this.facing !== 'left') {
            this.facing = 'left';
            this.consecutiveFacingTicks.left = 0;
        }
    }

    _applyZone() {
        if (this.motionLevel === 'playful') {
            this.zone = { width: 60, height: 20 };
        } else {
            this.zone = { width: 24, height: 10 };
        }

        if (this.movementElement) {
            this.movementElement.style.setProperty('--motion-zone-width', `${this.zone.width}px`);
            this.movementElement.style.setProperty('--motion-zone-height', `${this.zone.height}px`);
        }
    }

    _clampPosition() {
        const halfW = this.zone.width / 2;
        const halfH = this.zone.height / 2;
        this.position.x = this._clamp(this.position.x, -halfW, halfW);
        this.position.y = this._clamp(this.position.y, -halfH, halfH);
    }

    _resetKinematics() {
        this.position.x = 0;
        this.position.y = 0;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.target.x = 0;
        this.target.y = 0;
        this.apply();
    }

    _setDebugOutline(enabled) {
        if (this.movementElement) {
            this.movementElement.classList.toggle('debug-motion-zone', enabled);
        }
    }

    _debugLog(now) {
        if (!this.debugMotion || now - this.lastDebugLogAt < 1000) return;
        this.lastDebugLogAt = now;
        console.info('[AgentIdentity][motion]', {
            status: this.status,
            facing: this.facing,
            speed: Number(this.speed.toFixed(3)),
            x: Number(this.position.x.toFixed(2)),
            y: Number(this.position.y.toFixed(2))
        });
    }

    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}

module.exports = MotionController;
