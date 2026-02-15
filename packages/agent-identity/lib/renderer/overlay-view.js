const PresenceStore = require('../presence-store');
const AsepriteAnimator = require('./skins/aseprite-animator');
const RoamingController = require('./roaming-controller');
const path = require('path');

class OverlayView {
    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('agent-identity-overlay');

        // Create wrapper for movement
        this.movementWrapper = document.createElement('div');
        this.movementWrapper.classList.add('agent-movement-wrapper');
        this.element.appendChild(this.movementWrapper);

        // Create a clickable shell that looks native in IDE
        this.shell = document.createElement('div');
        this.shell.classList.add('agent-identity-shell');
        this.movementWrapper.appendChild(this.shell);

        // Determine asset path
        this.assetPath = path.join(__dirname, '..', '..', 'assets', 'eris');

        // Initialize Animator with Aseprite support
        this.animator = new AsepriteAnimator({
            pngUrl: path.join(this.assetPath, '16x32 Idle.png'),
            jsonUrl: path.join(this.assetPath, '16x32 Idle.json'),
            scale: 2
        });

        // Mount sprite inside shell
        this.animator.mount(this.shell);

        // Initialize Roaming Controller
        this.roamingController = new RoamingController(this.movementWrapper, this.animator);

        // Listen for roaming actions (Walk, Run, Idle)
        this.roamingController.onDidChangeAction((action) => {
            // action is 'Idle', 'Walk', 'Run'
            // Need to map to asset name like '16x32 Run.png'
            let baseName = `16x32 ${action}`;

            // If action is Idle, we might want to respect current status if it's 'planning' etc?
            // But RoamingController handles picking action based on status.
            // If status is 'planning', RoamingController forces 'Idle' state. 
            // But OverlayView.update ALSO sets asset based on status.
            // We need to decide who wins.

            // Strategy: The RoamingController emits 'Idle' or 'Walk'/'Run'.
            // If it emits 'Walk'/'Run', we definitely want that animation.
            // If it emits 'Idle', we want the animation corresponding to the current STATUS (e.g. Rotate if planning).

            if (action === 'Idle') {
                // Re-apply status based animation
                this.updateAnimationForStatus(this.currentStatus || 'idle');
            } else {
                // Force movement animation
                const pngUrl = path.join(this.assetPath, `${baseName}.png`);
                const jsonUrl = path.join(this.assetPath, `${baseName}.json`);
                this.animator.setAsset({ pngUrl, jsonUrl });
            }
        });

        this.element.addEventListener('click', () => {
            atom.commands.dispatch(atom.views.getView(atom.workspace), 'agent-identity:open-control-room');
        });

        this.currentStatus = 'idle';
        this.subscription = PresenceStore.onDidChange(this.update.bind(this));
    }

    attach() {
        document.body.appendChild(this.element);
        this.animator.playTag('default');
        this.roamingController.startLoop();
    }

    detach() {
        this.animator.stop();
        this.roamingController.dispose();
        this.subscription.dispose();
        this.element.remove();
    }

    update(snapshot) {
        const { status } = snapshot;
        this.currentStatus = status;

        // Update Roaming Controller with new status (so it knows to stop wandering if busy)
        this.roamingController.setStatus(status);

        if (status === 'offline') {
            this.shell.classList.add('is-offline');
        } else {
            this.shell.classList.remove('is-offline');
        }

        if (status === 'error') {
            this.shell.classList.add('is-error');
        } else {
            this.shell.classList.remove('is-error');
        }

        // We only forcefully set animation here if the agent is NOT moving.
        // If agent is moving, RoamingController controls the animation (Walk/Run).
        // If agent is Idle, RoamingController emits 'Idle', which calls updateAnimationForStatus.
        // So we should call it here too to handle immediate status change response.
        if (this.roamingController.state === 'idle') {
            this.updateAnimationForStatus(status);
        }
    }

    updateAnimationForStatus(status) {
        let baseName = '16x32 Idle';
        switch (status) {
            case 'planning':
                baseName = '16x32 Rotate';
                break;
            case 'executing':
                // logic handled by roaming controller (running) or here if forced?
                // If executing, we want Run. Roaming controller will likely pick Run action.
                // But if it decides to 'Idle' briefly, we might want 'Run' in place? 
                // Let's stick to Idle for 'in-place' non-movement.
                baseName = '16x32 Idle';
                break;
            case 'patching':
                baseName = '16x32 Interact';
                break;
            case 'reviewing':
                baseName = '16x32 Walk';
                break;
            case 'error':
                baseName = '16x32 Idle';
                break;
            default:
                baseName = '16x32 Idle';
        }

        const pngUrl = path.join(this.assetPath, `${baseName}.png`);
        const jsonUrl = path.join(this.assetPath, `${baseName}.json`);
        this.animator.setAsset({ pngUrl, jsonUrl });
    }
}

module.exports = OverlayView;
