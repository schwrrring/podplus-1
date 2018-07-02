import * as React from "react";
import { IdleWatcher } from "./idle-watcher";

const dummyScrollContainerStyles: React.CSSProperties = {
    position: "absolute",
    height: "100%",
    width: "100%",
    overflow: "auto",
    top: 0,
    WebkitOverflowScrolling: "touch",
    WebkitTapHighlightColor: "rgba(0,0,0,0)"
};

export interface DummyScrollerProps {
    height: number;
    onScroll: (y: number) => void;
    onIdle?: () => void;
    scrollPosition: number;
}

// This is the element that sits on top of our actual rendered view, and provides
// the native scrolling functionality users are used to. One complication is that
// because this sits above the view, we need to pass click events through this
// and onto the elements underneath - check the onClick function for that.

export class DummyScroller extends React.Component<DummyScrollerProps> {
    element?: HTMLDivElement;
    idleWatcher?: IdleWatcher;

    render() {
        return (
            <div ref={el => (this.element = el!)} style={dummyScrollContainerStyles}>
                <div
                    style={{
                        width: "100%",
                        minHeight: "100%",
                        // We add 2px of padding to handle the iOS "rubber banding" in
                        // onScroll() - this gives us a 1px buffer at the top and bottom
                        // of the view to use to keep scroll events within this element.
                        paddingBottom: "2px",
                        height: this.props.height,
                        position: "absolute"
                    }}
                />
            </div>
        );
    }

    componentDidMount() {
        if (!this.element) {
            throw new Error("Mounted component but no reference to container element");
        }

        this.element.addEventListener("scroll", this.onScroll.bind(this));
        this.element.addEventListener("click", this.passThroughEvent.bind(this));
        this.element.addEventListener("touchstart", this.touchStart.bind(this));
        this.element.addEventListener("touchend", this.touchEnd.bind(this));

        // We use the IdleWatcher to detect when it's safe for us to render new
        // elements when we are reaching the edge of the buffer. We pass this
        // up to the parent element in this.onIdle.
        this.idleWatcher = new IdleWatcher(this.element);
        this.idleWatcher.onIdle = this.props.onIdle;

        // now we set the scroll position to 1px to stop any scroll up passing beyond this
        // element

        this.element.scrollTop = 1;
    }

    currentTouchTarget?: {
        el: Element;
        touchY: number;
    } = undefined;

    touchStart(e: TouchEvent) {
        if (!this.element) {
            throw new Error("Should never hit this function without an element");
        }

        // We pass the touchstart event down to our target, but we also keep a reference to it,
        // because we fire a touchend event manually when we've scrolled too far.

        let targetElement = this.passThroughEvent(e);
        if (!targetElement) {
            return;
        }
        console.info("DUMMY: Storing touch target", targetElement);

        this.currentTouchTarget = {
            el: targetElement,
            touchY: this.element.scrollTop
        };
    }

    touchEnd(e: TouchEvent) {
        if (!this.currentTouchTarget) {
            return;
        }
        let new_event = new (e.constructor as any)(e.type, e);
        this.currentTouchTarget.el.dispatchEvent(new_event);
        this.currentTouchTarget = undefined;
    }

    passThroughEvent(e: MouseEvent | TouchEvent) {
        if (!this.element) {
            throw new Error("Should never hit this function without an element");
        }

        // Because this element is layered on top of the actual elements we want to
        // display, it intercepts click events. In order to replicate functionality,
        // we set this element to have pointer-events of "none", so the browser does
        // not consider it an interactive element.

        this.element.style.pointerEvents = "none";

        // Then, document.elementFromPoint returns the element that *is* interactive now
        // (i.e. the underneath).

        let clientX = -1;
        let clientY = -1;

        if (e instanceof MouseEvent) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        if (clientX === -1 || clientY === -1) {
            throw new Error("Could not get client coordinates from event");
        }

        let el = document.elementFromPoint(clientX, clientY);

        // Once we've got that reference, we can restore normal pointer-events so that we can
        // scroll again.

        this.element.style.pointerEvents = "";

        // And, if there was an element, fire the click event onto that element:

        if (el) {
            let new_event = new (e.constructor as any)(e.type, e);
            el.dispatchEvent(new_event);
        }

        return el;
    }

    onScroll() {
        if (!this.element) {
            throw new Error("Cannot process scroll events without element reference");
        }

        if (this.currentTouchTarget) {
            // If we have an item that's received a touchstart event, we manually fire a
            // touchend when we've scrolled past a certain point, to mirror what native
            // controls do. Choosing 5px kind of arbitrarily here...

            if (Math.abs(this.currentTouchTarget.touchY - this.element.scrollTop) > 5) {
                console.info("DUMMY: Dispatching touchend to current target", this.currentTouchTarget.el);

                let touchEndEvent = new TouchEvent("touchend", {
                    bubbles: true
                });
                this.currentTouchTarget.el.dispatchEvent(touchEndEvent);
                this.currentTouchTarget = undefined;
            }
        }

        // If an iOS scroll element is either at the max or min scroll position,
        // Safari sends the scroll event to the parent, all the up to document.body.
        // We don't want this - we want to contain the scrolling to this element. So if we
        // are at either extreme, we bump it by one pixel.
        //
        // We don't want to actually report that number to our parent event though (it's easier
        // for it to be ignorant of this) so we store the value we will actually return
        // separately.

        let toReturn = this.element.scrollTop;

        if (this.element.scrollTop === 1) {
            toReturn = 0;
            return;
        }

        if (this.element.scrollTop === 0) {
            this.element.scrollTop = 1;
        } else if (this.element.scrollTop === this.element.scrollHeight - this.element.clientHeight) {
            this.element.scrollTop -= 1;
        }

        this.props.onScroll(toReturn);
    }

    get clientHeight() {
        if (!this.element) {
            throw new Error("Cannot fetch client height before element is rendered");
        }
        // -1px because of the bottom padding
        return this.element.clientHeight - 1;
    }

    get position() {
        if (!this.element) {
            throw new Error("Cannot get scroll position without element reference");
        }
        if (this.element.scrollTop === 1) {
            // hide our buffer
            return 0;
        }
        return this.element.scrollTop;
    }

    shouldComponentUpdate(nextProps: DummyScrollerProps) {
        // Small performance enhancement (maybe?) - we don't need to re-render
        // the element itself unless the height changes.
        return nextProps.height !== this.props.height || nextProps.scrollPosition !== this.props.scrollPosition;
    }

    componentDidUpdate(oldProps: DummyScrollerProps) {
        if (this.props.scrollPosition === this.element!.scrollTop) {
            return;
        }

        if (oldProps.height !== this.props.height) {
            console.info("DUMMY: Changed scroll height from", oldProps.height, " to", this.props.height);
        }

        let newPosition = this.props.scrollPosition;

        if (!this.element) {
            throw new Error("Cannot set scroll position without element reference");
        }

        if (newPosition === 0 && this.element.scrollTop <= 1) {
            // Because of our 1px scroll buffer, we ignore any instructions to do this
            return;
        }

        let maxScroll = this.element.scrollHeight - this.element.clientHeight;

        if (newPosition == maxScroll && this.element.scrollTop == maxScroll - 1) {
            // Same as above - we ignore this because of our 1px buffer at the bottom.
            return;
        }

        console.warn(
            "set scroll from",
            this.element.scrollTop,
            "to",
            newPosition,
            "with height",
            this.element.clientHeight,
            "and scroll height",
            this.element.scrollHeight
        );
        this.element.scrollTop = newPosition;
    }
}
