'use strict';

const path = require('path');
const fs = require('fs');
const PresenceStore = require('../presence-store');
const MotionController = require('./motion-controller');
const AsepriteAnimator = require('./skins/aseprite-animator');

class OverlayView {
    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('agent-identity-overlay');

        this.movementWrapper = document.createElement('div');
        this.movementWrapper.classList.add('agent-movement-wrapper');
        this.element.appendChild(this.movementWrapper);

        this.shell = document.createElement('div');
        this.shell.classList.add('agent-identity-shell');
        this.movementWrapper.appendChild(this.shell);

        this.spriteFlipWrapper = document.createElement('div');
        this.spriteFlipWrapper.classList.add('agent-sprite-flip-wrapper');
        this.shell.appendChild(this.spriteFlipWrapper);

        this.spriteMount = document.createElement('div');
        this.spriteMount.classList.add('agent-sprite-mount');
        this.spriteFlipWrapper.appendChild(this.spriteMount);

        this.assetPath = path.join(__dirname, '..', '..', 'assets', 'eris');
        this.currentAsset = null;
        this.currentAction = null;
        this.currentStatus = 'idle';

        this.animator = new AsepriteAnimator({
            pngUrl: path.join(this.assetPath, '16x32 Idle.png'),
            jsonUrl: path.join(this.assetPath, '16x32 Idle.json'),
            scale: 2
        });
        this.animator.mount(this.spriteMount);

        this.motionController = new MotionController({
            movementElement: this.movementWrapper,
            flipElement: this.spriteFlipWrapper,
            shellElement: this.shell
        });

        this.element.addEventListener('click', () => {
            atom.commands.dispatch(atom.views.getView(atom.workspace), 'agent-identity:open-control-room');
        });

        this.subscription = PresenceStore.onDidChange((snapshot) => {
            this.update(snapshot);
        });
    }

    attach() {
        document.body.appendChild(this.element);
        this.animator.playTag('default');
        this.update(PresenceStore.getSnapshot());
    }

    detach() {
        if (this.subscription) {
            this.subscription.dispose();
            this.subscription = null;
        }
        this.motionController.dispose();
        this.animator.stop();
        this.animator.unmount();
        this.element.remove();
    }

    update(snapshot) {
        if (!snapshot) return;

        this.currentStatus = snapshot.status || 'idle';
        this.motionController.onPresence(snapshot);

        this.shell.classList.toggle('is-offline', this.currentStatus === 'offline');
        this.shell.classList.toggle('is-error', this.currentStatus === 'error');

        const action = this.resolveAction(snapshot, this.motionController.getSpeed());
        this.applyAction(action);
    }

    resolveAction(snapshot, speed) {
        const status = snapshot.status || 'idle';

        switch (status) {
            case 'planning':
                return 'Rotate';
            case 'patching':
                return 'Interact';
            case 'reviewing':
                return speed > 0.03 ? 'Walk' : 'Idle';
            case 'executing':
                return speed > 0.03 ? 'Run' : 'Idle';
            default:
                return 'Idle';
        }
    }

    applyAction(action) {
        if (!action) return;

        const directionMode = atom.config.get('agent-identity.directionMode') || 'flip';
        const facing = this.motionController.getFacing();
        const directionalSupported = directionMode === 'assets' && (action === 'Walk' || action === 'Run');

        let baseName = `16x32 ${action}`;
        if (directionalSupported && facing === 'left') {
            const leftVariant = `16x32 ${action} Left`;
            if (this.assetExists(leftVariant)) {
                baseName = leftVariant;
            }
        }

        this.spriteFlipWrapper.classList.toggle('force-face-right', directionMode === 'assets');

        const pngUrl = path.join(this.assetPath, `${baseName}.png`);
        const jsonUrl = path.join(this.assetPath, `${baseName}.json`);
        const nextAsset = `${pngUrl}|${jsonUrl}`;

        if (this.currentAsset !== nextAsset) {
            this.currentAsset = nextAsset;
            this.animator.setAsset({ pngUrl, jsonUrl });
        }

        this.animator.playTag('default');
        this.currentAction = action;
    }

    assetExists(baseName) {
        try {
            return fs.existsSync(path.join(this.assetPath, `${baseName}.png`)) &&
                fs.existsSync(path.join(this.assetPath, `${baseName}.json`));
        } catch (error) {
            return false;
        }
    }
}

module.exports = OverlayView;
