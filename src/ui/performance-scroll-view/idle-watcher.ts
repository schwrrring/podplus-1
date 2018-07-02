// We add the event listeners as passive, because they don't ever need
// to block an event.
const eventListenerOptions: any = { passive: true };

export class IdleWatcher {
    target: HTMLElement;

    onIdle?: () => void;

    constructor(target: HTMLElement) {
        this.target = target;
        this.onScrollComplete = this.onScrollComplete.bind(this);
        this.onScroll = this.onScroll.bind(this);

        // Now add the listeners to our target.
        target.addEventListener("touchstart", this.onTouchStart.bind(this), eventListenerOptions);
        target.addEventListener("touchend", this.onTouchEnd.bind(this), eventListenerOptions);
        this.target.addEventListener("scroll", this.onScroll, eventListenerOptions);

        // Before we do anything else, set the idle promise for the first time.
        this.resetIdlePromise();
    }

    private idlePromise: Promise<void>;
    private idleFulfill?: () => void;

    resetIdlePromise() {
        // We overwrite the existing promise and fulfill function, meaning
        // any time onIdle is called it'll wait until we resolve.

        this.idlePromise = new Promise<void>(f => (this.idleFulfill = f));
        this.idlePromise.then(() => {
            if (this.onIdle) this.onIdle();
        });
    }

    private fulfillIdle() {
        if (!this.idleFulfill) {
            throw new Error("Tried to fulfill idle when promise does not exist");
        }

        console.info("IDLE: Resetting back to idle.");

        this.idleFulfill();
        this.idleFulfill = undefined;
    }

    isCurrentlyTouching = false;

    onTouchStart() {
        // We assume that a touch is the sign of some kind of interaction, usually
        // scrolling. So we reset the promise to wait for the touchend event.

        this.resetIdlePromise();
        this.isCurrentlyTouching = true;

        // Now that we know we're in a touch event, we add the scroll listener
        // this.target.addEventListener("scroll", this.onScroll, eventListenerOptions);

        console.info("IDLE: Setting target as currently in use");
    }

    onTouchEnd() {
        this.isCurrentlyTouching = false;

        // Normally a touchend would be a sign of the interaction even ending, but
        // if we've scrolled then the momentum might mean the target is still moving.
        // So if we have a timer, we wait for it to complete.

        if (this.scrollCompleteTimeout !== undefined) {
            console.info("IDLE: Scroll timer on touchend, so leaving as in use");
            return;
        }

        // A special case for iOS - the "rubber band" scrolling means that a user can
        // let go past the bounds of actual scroll limits. If they do, we're guaranteed
        // to have at least one more scroll event fired as the target scrolls back
        // within bounds. So we don't fulfill here, and wait instead.

        let maxScrollPosition = this.target.scrollHeight - this.target.clientHeight;

        if (this.target.scrollTop < 0 || this.target.scrollTop > maxScrollPosition) {
            return;
        }

        // But if we don't, we can fulfill it immediately.

        this.fulfillIdle();
    }

    scrollCompleteTimeout: any = undefined;

    onScroll() {
        if (this.idleFulfill === undefined) {
            // If we're on a desktop there won't have been a touchstart event to
            // reset the promise. So we do it here.
            this.resetIdlePromise();
        }

        // Because we don't really know when the scroll is going to finish, we set a
        // 100ms timer every time we get a scroll, clearing any previous timer when
        // we do.
        if (this.scrollCompleteTimeout === undefined) {
            console.info("IDLE: Scroll event - resetting fulfill");
        }
        clearTimeout(this.scrollCompleteTimeout);
        this.scrollCompleteTimeout = setTimeout(this.onScrollComplete, 100);
    }

    onScrollComplete() {
        // At this point we haven't had a scroll event in 100ms, so we assume the
        // scrolling is complete. So we can fulfill the promise.
        this.scrollCompleteTimeout = undefined;

        if (this.isCurrentlyTouching === false) {
            this.fulfillIdle();
        }

        // this.target.removeEventListener("scroll", this.onScroll);
    }
}
