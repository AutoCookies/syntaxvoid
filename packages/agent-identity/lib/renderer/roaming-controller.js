'use strict';

const { Emitter } = require('event-kit');

class RoamingController {
    constructor(element, animator) {
        this.element = element;
        this.animator = animator;
        this.emitter = new Emitter();

        // Config
        this.motionLevel = atom.config.get('agent-identity.motionLevel') || 'subtle';

        // Physics / State
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.target = null;
        this.speed = 2; // pixels per frame
        this.state = 'idle'; // idle, moving, interacting
        this.facing = 'right'; // right, left

        // External Status (Editor state)
        this.editorStatus = 'idle';

        // Loop
        this.animationFrameId = null;
        this.lastTime = 0;

        // Bounds (will update on resize)
        this.bounds = { width: window.innerWidth, height: window.innerHeight };
        window.addEventListener('resize', () => {
            this.bounds = { width: window.innerWidth, height: window.innerHeight };
            this.clampPosition();
        });

        // Start somewhere visible (bottom-left area)
        this.position.x = 100;
        this.position.y = this.bounds.height - 100;

        console.log('[RoamingController] Init:', {
            bounds: this.bounds,
            pos: this.position
        });

        this.startLoop();
        this.setupDrag(); // Initialize drag handlers
        this.pickNewAction();
    }

    setStatus(status) {
        this.editorStatus = status;
        // React immediately to status changes?
        if (status === 'planning' || status === 'patching') {
            this.target = null; // Stop moving
            this.state = 'idle';
        }
    }

    startLoop() {
        console.log('[RoamingController] Starting loop');
        const loop = (time) => {
            const dt = time - this.lastTime;
            this.lastTime = time;

            try {
                this.update(dt);
                this.render();
            } catch (e) {
                console.error('[RoamingController] Loop Error:', e);
            }

            this.animationFrameId = requestAnimationFrame(loop);
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    stopLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    pickNewAction() {
        // AI Logic: What to do next?
        const delay = Math.random() * 2000 + 1000; // 1-3s delay

        setTimeout(() => {
            if (this.editorStatus !== 'idle' && this.editorStatus !== 'executing') {
                // If busy, just wait
                this.pickNewAction();
                return;
            }

            // 30% chance to idle, 70% to move
            if (Math.random() < 0.3) {
                this.state = 'idle';
                this.target = null;
                this.emitter.emit('did-change-action', 'Idle');
            } else {
                this.state = 'moving';
                // Pick random point
                const padding = 50;
                this.target = {
                    x: padding + Math.random() * (this.bounds.width - padding * 2),
                    y: padding + Math.random() * (this.bounds.height - padding * 2)
                };
                // Determine animation based on status
                const anim = this.editorStatus === 'executing' ? 'Run' : 'Walk';
                this.emitter.emit('did-change-action', anim);
            }

            // Re-queue
            this.pickNewAction();
        }, delay);
    }

    update(dt) {
        if (!this.target) return;

        const dx = this.target.x - this.position.x;
        const dy = this.target.y - this.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
            // Arrived
            this.position.x = this.target.x;
            this.position.y = this.target.y;
            this.target = null;
            this.state = 'idle';
            this.emitter.emit('did-change-action', 'Idle');
            // Wait for next pickNewAction to trigger
            return;
        }

        // Move
        const speed = this.editorStatus === 'executing' ? 6 : 2; // Run fast if executing

        const angle = Math.atan2(dy, dx);
        this.velocity.x = Math.cos(angle) * speed;
        this.velocity.y = Math.sin(angle) * speed;

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Facing
        if (this.velocity.x > 0.1) this.facing = 'right';
        if (this.velocity.x < -0.1) this.facing = 'left';
    }

    clampPosition() {
        const padding = 20;
        this.position.x = Math.max(padding, Math.min(this.bounds.width - padding, this.position.x));
        this.position.y = Math.max(padding, Math.min(this.bounds.height - padding, this.position.y));
    }

    render() {
        // Apply transform
        // Use translate3d for GPU
        // Flip using scaleX
        const scaleX = this.facing === 'left' ? -1 : 1;
        this.element.style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0) scaleX(${scaleX})`;

        // Debug
        // console.log(`[Roaming] x:${this.position.x.toFixed(0)} vx:${this.velocity.x.toFixed(2)} fac:${this.facing} drag:${this.isDragging}`);
    }

    setupDrag() {
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        this.element.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Left click only
            this.isDragging = true;
            this.state = 'interacting';
            this.target = null; // Stop autonomous movement
            this.velocity = { x: 0, y: 0 };

            // Calculate offset logic
            // The element is positioned at this.position.x/y
            // Mouse is at e.clientX/Y
            this.dragOffset.x = e.clientX - this.position.x;
            this.dragOffset.y = e.clientY - this.position.y;

            // Prevent default to avoid text selection etc
            e.preventDefault();
            e.stopPropagation();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            this.position.x = e.clientX - this.dragOffset.x;
            this.position.y = e.clientY - this.dragOffset.y;

            // Clamp during drag
            this.clampPosition();

            // Force render update immediately for smoothness? 
            // The loop handles it, but maybe update lastTime to prevent jumps?
        });

        window.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.state = 'idle';
            this.pickNewAction(); // Resume life
        });
    }

    onDidChangeAction(callback) {
        return this.emitter.on('did-change-action', callback);
    }

    dispose() {
        this.stopLoop();
        this.emitter.dispose();
        // Remove window listeners? 
        // Need to bind them to refer, but for now this leaks a bit on reload if not careful.
        // We really should bind functions.
    }
}

module.exports = RoamingController;
