'use strict';

const { Emitter } = require('event-kit');

class RoamingController {
    constructor(wrapperEl, animator, assets) {
        this.wrapperEl = wrapperEl;
        this.animator = animator;
        this.assets = assets; // { Idle, Walk, Run, Rotate }

        this.emitter = new Emitter();

        this.bounds = { width: window.innerWidth, height: window.innerHeight };
        this._onResize = () => {
            this.bounds = { width: window.innerWidth, height: window.innerHeight };
            this._clampPosition();
        };
        window.addEventListener('resize', this._onResize);

        this.position = { x: 100, y: this.bounds.height - 100 };
        this.velocity = { x: 0, y: 0 };
        this.target = null;

        this.editorStatus = 'idle';
        this.baseMoveAnim = 'Walk'; // Walk | Run
        this.facing = 'right';

        this.phase = 'idle'; // idle | rotating | moving
        this.rotateInFlight = false;

        this.tickId = null;
        this.lastTime = 0;

        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.startPos = { x: 0, y: 0 };
        this.hasMoved = false;

        this._applyTransform();
        this._setIdleHard(); // start = idle, no rotate

        this._setupDrag();
        this._startLoop();
        this._pickNewAction();
    }

    setStatus(status) {
        this.editorStatus = status;
        this.baseMoveAnim = status === 'executing' ? 'Run' : 'Walk';

        // nếu editor đang busy kiểu planning/patching => dừng roaming và về idle
        if (status === 'planning' || status === 'patching') {
            this.target = null;
            this.velocity = { x: 0, y: 0 };
            this._setIdleHard();
        }
    }

    onDidChangeAction(cb) {
        return this.emitter.on('did-change-action', cb);
    }

    dispose() {
        if (this.tickId) {
            cancelAnimationFrame(this.tickId);
            this.tickId = null;
        }
        window.removeEventListener('resize', this._onResize);
        this.emitter.dispose();
    }

    _startLoop() {
        this.lastTime = performance.now();
        const loop = (t) => {
            const dt = Math.min(40, t - this.lastTime || 16);
            this.lastTime = t;

            this._update(dt);
            this._applyTransform();

            this.tickId = requestAnimationFrame(loop);
        };
        this.tickId = requestAnimationFrame(loop);
    }

    _pickNewAction() {
        const delay = Math.random() * 2000 + 1000; // 1-3s
        setTimeout(() => {
            if (this.isDragging) return this._pickNewAction();

            if (this.editorStatus !== 'idle' && this.editorStatus !== 'executing') {
                return this._pickNewAction();
            }

            if (Math.random() < 0.3) {
                this.target = null;
                this.velocity = { x: 0, y: 0 };
                this._setIdleHard();
                this.emitter.emit('did-change-action', 'Idle');
            } else {
                const padding = 50;
                this.target = {
                    x: padding + Math.random() * (this.bounds.width - padding * 2),
                    y: padding + Math.random() * (this.bounds.height - padding * 2),
                };
                this.emitter.emit('did-change-action', this.baseMoveAnim);
            }

            this._pickNewAction();
        }, delay);
    }

    _update(dt) {
        if (!this.target) {
            // không roaming => idle, KHÔNG rotate
            if (this.phase !== 'idle') this._setIdleHard();
            return;
        }

        // nếu đang rotate, freeze movement để đảm bảo “không vừa walk vừa rotate”
        if (this.phase === 'rotating') return;

        const dx = this.target.x - this.position.x;
        const dy = this.target.y - this.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
            this.position.x = this.target.x;
            this.position.y = this.target.y;
            this.target = null;
            this.velocity = { x: 0, y: 0 };
            this._setIdleHard();
            this.emitter.emit('did-change-action', 'Idle');
            return;
        }

        const speed = this.baseMoveAnim === 'Run' ? 6 : 2;
        const angle = Math.atan2(dy, dx);
        this.velocity.x = Math.cos(angle) * speed;
        this.velocity.y = Math.sin(angle) * speed;

        const desiredFacing = this.velocity.x < -0.1 ? 'left' : this.velocity.x > 0.1 ? 'right' : this.facing;

        // nếu đổi hướng => rotate trước, xong mới move + walk/run
        if (desiredFacing !== this.facing) {
            this._rotateTo(desiredFacing);
            return;
        }

        // đã đúng hướng => move + walk/run
        this.phase = 'moving';
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this._clampPosition();

        // đảm bảo đang move thì set walk/run (nếu lỡ bị idle)
        this._ensureMoveAnim();
    }

    _ensureMoveAnim() {
        const want = this.baseMoveAnim;
        if (!this.assets[want]) return;

        // đang rotating thì không đụng
        if (this.phase === 'rotating') return;

        // nếu chưa đúng anim thì switch
        if (this._currentAnim !== want) {
            this._currentAnim = want;
            this.animator.setAsset(this.assets[want]);
            this.animator.playLoopAll();
        }
    }

    _setIdleHard() {
        this.phase = 'idle';
        this.rotateInFlight = false;

        if (!this.assets.Idle) return;

        if (this._currentAnim !== 'Idle') {
            this._currentAnim = 'Idle';
            this.animator.setAsset(this.assets.Idle);
            this.animator.playLoopAll();
        }
    }

    _rotateTo(nextFacing) {
        if (!this.assets.Rotate) {
            // fallback: không có rotate asset thì chỉ flip và đi luôn
            this.facing = nextFacing;
            this.animator.setFacing(this.facing);
            this._ensureMoveAnim();
            return;
        }

        this.phase = 'rotating';
        this.rotateInFlight = true;

        this.facing = nextFacing;
        this.animator.setFacing(this.facing);

        this._currentAnim = 'Rotate';
        this.animator.setAsset(this.assets.Rotate);

        // rotate “1 lần” xong mới chuyển qua walk/run
        this.animator.playOnceAll(() => {
            // có thể trong lúc rotate user stop roaming => lúc đó về idle
            this.rotateInFlight = false;

            if (!this.target) {
                this._setIdleHard();
                return;
            }

            this.phase = 'moving';
            this._ensureMoveAnim();
        });
    }

    _applyTransform() {
        // wrapper controls position only
        this.wrapperEl.style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0)`;
    }

    _clampPosition() {
        const padding = 20;
        this.position.x = Math.max(padding, Math.min(this.bounds.width - padding, this.position.x));
        this.position.y = Math.max(padding, Math.min(this.bounds.height - padding, this.position.y));
    }

    _setupDrag() {
        this.wrapperEl.style.pointerEvents = 'auto';

        this.wrapperEl.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            this.isDragging = true;
            this.hasMoved = false;

            this.target = null;
            this.velocity = { x: 0, y: 0 };
            this._setIdleHard();

            this.dragOffset.x = e.clientX - this.position.x;
            this.dragOffset.y = e.clientY - this.position.y;
            this.startPos = { x: e.clientX, y: e.clientY };

            e.preventDefault();
            e.stopPropagation();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            if (!this.hasMoved) {
                const dx = e.clientX - this.startPos.x;
                const dy = e.clientY - this.startPos.y;
                if (Math.sqrt(dx * dx + dy * dy) < 5) return;
                this.hasMoved = true;
            }

            this.position.x = e.clientX - this.dragOffset.x;
            this.position.y = e.clientY - this.dragOffset.y;
            this._clampPosition();
        });

        window.addEventListener('mouseup', () => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this._pickNewAction();
        });

        this.wrapperEl.addEventListener('dblclick', (e) => {
            // optional: open control room
            atom.commands.dispatch(atom.views.getView(atom.workspace), 'agent-identity:open-control-room');
            e.preventDefault();
            e.stopPropagation();
        });
    }
}

module.exports = RoamingController;
