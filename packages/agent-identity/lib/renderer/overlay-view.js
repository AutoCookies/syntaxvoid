'use strict';

const path = require('path');
const fs = require('fs');

const PresenceStore = require('../presence-store');
const AsepriteAnimator = require('./skins/aseprite-animator');
const RoamingController = require('./roaming-controller');

class OverlayView {
    constructor() {
        // wrapper for positioning + input
        this.element = document.createElement('div');
        this.element.classList.add('agent-identity-overlay');

        Object.assign(this.element.style, {
            position: 'fixed',
            left: '0px',
            top: '0px',
            zIndex: '1000',
            width: '0px',
            height: '0px',
            pointerEvents: 'none', // Wrapper pass-through, inner elements handle clicks
        });

        // assets folder
        this.assetPath = OverlayView.resolveAssetPath();

        this.assets = {
            Idle: {
                pngUrl: path.join(this.assetPath, '16x32 Idle.png'),
                jsonUrl: path.join(this.assetPath, '16x32 Idle.json'),
            },
            Walk: {
                pngUrl: path.join(this.assetPath, '16x32 Walk.png'),
                jsonUrl: path.join(this.assetPath, '16x32 Walk.json'),
            },
            Run: {
                pngUrl: path.join(this.assetPath, '16x32 Run.png'),
                jsonUrl: path.join(this.assetPath, '16x32 Run.json'),
            },
            Rotate: {
                pngUrl: path.join(this.assetPath, '16x32 Rotate.png'),
                jsonUrl: path.join(this.assetPath, '16x32 Rotate.json'),
            },
        };

        this.animator = new AsepriteAnimator({
            ...this.assets.Idle,
            scale: 2,
        });
        this.animator.mount(this.element);
        this.animator.setFacing('right');

        this.roaming = new RoamingController(this.element, this.animator, this.assets);

        this.subscription = PresenceStore.onDidChange((snapshot) => this.update(snapshot));
    }

    attach() {
        document.body.appendChild(this.element);
    }

    detach() {
        this.subscription?.dispose?.();
        this.subscription = null;

        this.roaming?.dispose?.();
        this.roaming = null;

        this.animator?.unmount?.();
        this.animator = null;

        this.element.remove();
    }

    update(snapshot) {
        // Presence chỉ ảnh hưởng tốc độ move (Walk vs Run) và có thể disable roaming.
        // Quan trọng: “không roaming => idle, không rotate” đã được roaming-controller đảm bảo.

        if (snapshot.status === 'offline') {
            this.element.classList.add('offline');
        } else {
            this.element.classList.remove('offline');
        }

        if (snapshot.status === 'error') {
            this.element.classList.add('shake');
        } else {
            this.element.classList.remove('shake');
        }

        this.roaming.setStatus(snapshot.status);
    }
}

OverlayView.resolveAssetPath = function resolveAssetPath() {
    const candidates = [
        path.resolve(__dirname, '..', '..', '..', 'assets', 'eris'),
        path.resolve(__dirname, '..', '..', 'assets', 'eris'),
    ];

    return candidates.find((candidate) => fs.existsSync(path.join(candidate, '16x32 Idle.json'))) || candidates[0];
};

module.exports = OverlayView;
