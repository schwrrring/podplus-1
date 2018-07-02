import { Component } from "react";
import * as React from "react";
import { ScrollViewItem } from "./scroll-view-item";
// import { /*ForwardsIndicator,*/ BackwardsIndicator } from "./paging-indicator";
import { ItemBuffer, ItemBufferProperties } from "./item-buffer";
// import { IdleWatcher } from "./idle-watcher";
import { DummyScroller } from "./dummy-scroller";

const scrollViewStyles: React.CSSProperties = {
    overflow: "hidden",
    position: "relative",
    // background: process.env.NODE_ENV == "development" ? "blue" : undefined
};

export enum AddNewItemsTo {
    Top = "top",
    Bottom = "bottom"
}

export type AnimationEasingFunction = (
    currentTime: number,
    initialValue: number,
    changeInValue: number,
    duration: number
) => number;

export interface PerformanceScrollViewProperties extends ItemBufferProperties {
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    addNewItemsTo?: AddNewItemsTo;
    animationDuration?: number;
    animationEaseFunction?: AnimationEasingFunction;
    startIndex?: number;
    moreIndicatorGenerator?: (numberOfItems: number) => JSX.Element;

}

export interface ScrollViewAnimation {
    currentOffset: number;
    totalOffset: number;
    endTime: number;
}

export interface HeightAndPosition {
    position: number;
    height: number;
}

export interface PerformanceScrollViewState {
    itemBuffer: JSX.Element[];
    currentBufferOffset: number;
    container?: HTMLDivElement;
    mergedContainerStyles: React.CSSProperties;
    itemPositions: Map<number, HeightAndPosition>;
    totalHeight: number;
    currentScrollPosition: number;
    animation?: ScrollViewAnimation;
    isInitialRenderLoop: boolean;
    pendingItemRenders: Map<number, number>;
    newlyAddedIndexes: number[];
    numberOfNewItems: number;

}

export class PerformanceScrollView extends Component<PerformanceScrollViewProperties, PerformanceScrollViewState> {
    dummyScrollContainer: DummyScroller;
    itemBuffer: ItemBuffer;

    constructor(props: PerformanceScrollViewProperties) {
        super(props);


        // Bind functions to our class, to ensure it can access the right "this" variable
        this.itemRendered = this.itemRendered.bind(this);
        this.containerScrolled = this.containerScrolled.bind(this);
        this.setContainer = this.setContainer.bind(this);
        this.updateAnimation = this.updateAnimation.bind(this);
        this.onIdle = this.onIdle.bind(this);
        this.scrollToEnd = this.scrollToEnd.bind(this);
        this.recalculatePositions = this.recalculatePositions.bind(this);

        let bufferOffset = 0;
        if (props.startIndex) {
            // If we've specified a startIndex, we need to make sure our current buffer window
            // encompasses the item we want to start with.

            bufferOffset = props.startIndex - Math.floor(props.itemBufferSize / 2);

            // Then make sure it actually fits within the bounds of our items

            bufferOffset = Math.min(bufferOffset, props.numberOfItems - props.itemBufferSize);
            bufferOffset = Math.max(bufferOffset, 0);
        }

        this.state = {
            itemBuffer: [],
            currentBufferOffset: bufferOffset,
            itemPositions: new Map(),
            totalHeight: 0,
            currentScrollPosition: 0,
            mergedContainerStyles: Object.assign({}, props.style, scrollViewStyles),
            isInitialRenderLoop: true,
            pendingItemRenders: new Map(),
            newlyAddedIndexes: [],
            numberOfNewItems: 0
        };

        this.itemBuffer = new ItemBuffer(this);

        this.itemBuffer.load(props, this.state).then(itemBuffer => {
            this.setState({ itemBuffer });
        });
    }

    async componentWillReceiveProps(nextProps: PerformanceScrollViewProperties) {
        if (nextProps.numberOfItems !== this.props.numberOfItems) {
            console.info("VIEW: Number of items changed from", this.props.numberOfItems, "to", nextProps.numberOfItems);

            // We need to differentiate genuinely new items from items that are paged
            // in as a result of our item buffering. So when the total number of items
            // changes, we track the new indexes in an array, and check it when
            // calculating our offsets on the next render.

            let newlyAddedIndexes: number[] = [];

            // If there are fewer items than last time, we need to make sure we remove
            // the height for these missing items from our overall height.

            let removedHeight = 0;

            for (let i = this.props.numberOfItems; i < nextProps.numberOfItems; i++) {
                newlyAddedIndexes.push(i);
            }

            for (let i = nextProps.numberOfItems; i < this.props.numberOfItems; i++) {
                let existingRender = this.state.itemPositions.get(i);
                if (existingRender) {
                    removedHeight += existingRender.height;
                    this.state.itemPositions.delete(i);
                }
            }

            // Todo hier ne funktionalitaet hinzufuegen

            let numberOfNewItems = 0;

            if (this.isAtScrollEnd() === false) {
                // We use this variable to keep track of the number of items that have arrived
                // while the user is scrolling. If they are at the scroll end the items appear
                // automatically, so we don't add to it.


                numberOfNewItems = nextProps.numberOfItems - this.props.numberOfItems;
            }

            let newItems = await this.itemBuffer.load(nextProps, this.state);

            this.setState({
                itemBuffer: newItems,
                newlyAddedIndexes: newlyAddedIndexes,
                // Max of 0 because it'll be negative if we've reduced the number of items, but we
                // don't want to show that
                numberOfNewItems: Math.max(0, this.state.numberOfNewItems + numberOfNewItems),
                totalHeight: this.state.totalHeight - removedHeight,
                itemPositions: this.state.itemPositions
            });
        }

    }

    renderChildItems() {
        if (!this.state.container) {
            // We have to use a two-stage rendering process because we need the container
            // to be rendered (to get its height) before we render the children. So if this
            // is the first render and we have no container yet, return nothing.
            return null;
        }

        let topMargin = 0;
        if (
            this.props.addNewItemsTo === AddNewItemsTo.Bottom &&
            this.state.totalHeight < this.dummyScrollContainer.clientHeight
        ) {
            // If we're adding items to the bottom and our total height is less than the element size,
            // we push the items down so that they stay at the bottom.
            topMargin = this.dummyScrollContainer.clientHeight - this.state.totalHeight;
        }

        return this.state.itemBuffer.map((child, idx) => {
            let indexInFullItemList = this.state.currentBufferOffset + idx;

            let heightAndPosition = this.state.itemPositions.get(indexInFullItemList);

            let yPosition: number | undefined = undefined;

            if (heightAndPosition !== undefined) {
                yPosition = heightAndPosition.position;
                yPosition -= this.state.currentScrollPosition;
                yPosition += topMargin;

                if (this.state.animation) {
                    yPosition += this.state.animation.currentOffset;
                }

                if (yPosition + heightAndPosition.height <= 0) {
                    // After calculating scroll offsets etc, this item actually
                    // isn't currently visible. So don't update the CSS properties.
                    yPosition = undefined;
                } else if (yPosition > this.dummyScrollContainer.clientHeight) {
                    // Similarly, if it's off the bottom, we don't need to render
                    // that either.
                    yPosition = undefined;
                }
            }

            let keyPrefix = "item";
            let isTopItemButNotAtStart =
                indexInFullItemList === this.state.currentBufferOffset && indexInFullItemList > 0;

            let isBottomItemButNotAtEnd =
                indexInFullItemList === this.state.currentBufferOffset + this.state.itemBuffer.length - 1 &&
                this.state.currentBufferOffset + this.state.itemBuffer.length < this.props.numberOfItems;

            if (this.props.loadingMoreIndicator && (isTopItemButNotAtStart || isBottomItemButNotAtEnd)) {
                // This isn't actually an item with this index, it's a loading indicator
                // that serves as a placeholder. We make sure to differentiate the key for this,
                // otherwise ScrollViewItem doesn't call componentDidMount() and return the
                // correct item height;
                keyPrefix = "loadingindicator";
            }

            return (
                <ScrollViewItem
                    debugId={indexInFullItemList.toString()}
                    key={keyPrefix + "_" + indexInFullItemList}
                    itemIndex={indexInFullItemList}
                    onRender={this.itemRendered}
                    y={yPosition}
                >
                    {child}
                </ScrollViewItem>
            );
        });
    }

    renderMoreIndicator() {
        if (this.props.moreIndicatorGenerator === undefined || this.state.numberOfNewItems === 0) {
            return null;
        }

        let moreIndicator = this.props.moreIndicatorGenerator(this.state.numberOfNewItems);

        let containerStyles: React.CSSProperties = {
            position: "absolute",
            width: "100%"
        };

        if (this.props.addNewItemsTo === AddNewItemsTo.Bottom) {
            containerStyles.bottom = "0px";
        } else {
            containerStyles.top = "0px";
        }

        return (
            <div style={containerStyles} onClick={this.scrollToEnd}>
                {moreIndicator}
            </div>
        );
    }

    render() {
        return (
            <div
                id={this.props.id}
                style={this.state.mergedContainerStyles}
                className={this.props.className}
                ref={this.setContainer}
            >
                {this.renderChildItems()}

                <DummyScroller
                    ref={el => (this.dummyScrollContainer = el!)}
                    height={this.state.totalHeight}
                    onScroll={this.containerScrolled}
                    onIdle={this.onIdle}
                    scrollPosition={this.state.currentScrollPosition}
                />
                {this.renderMoreIndicator()}
            </div>
        );
    }

    setContainer(el: HTMLDivElement) {
        if (this.state.container) {
            return;
        }
        console.info("VIEW: Adding container to state");
        this.setState({
            container: el
        });
    }

    componentDidMount() {
        // new IdleWatcher(this.dummyScrollContainer);
    }

    containerScrolled(newScrollPosition: number) {
        if (newScrollPosition === this.state.currentScrollPosition) {
            // It's important that we have this here - componentDidUpdate() will set the
            // scroll position of the dummy scroller based on state. If we then setState
            // in response to that we'll end up in an infinite loop.

            return;
        }

        this.setState({
            currentScrollPosition: newScrollPosition
        });
    }

    animationTimer: number;
    componentDidUpdate() {
        if (this.state.animation) {
            this.animationTimer = requestAnimationFrame(this.updateAnimation);
        }

        if (this.state.pendingItemRenders.size > 0) {
            this.calculatePendingRenders();
        }

        // if (this.state.currentScrollPosition !== this.dummyScrollContainer.position) {
        //     // If we've set a new scroll position we want our dummy scroller to reflect
        //     // that, so let's change its position.
        //     this.dummyScrollContainer.position = this.state.currentScrollPosition;
        // }
    }

    updateAnimation(rightNow: number) {
        if (!this.state.animation) {
            return;
        }

        let timeUntilEnd = this.state.animation.endTime - Date.now();
        let howFarAlong = timeUntilEnd / this.props.animationDuration!;

        if (howFarAlong < 0) {
            // If we're at or past the end point in the animation, just clear state
            // and return.

            this.setState(
                {
                    animation: undefined
                },
                () => {
                    // Our idle listener is disabled if any animation is currently running.
                    // So, when it's complete, we trigger it just in case.
                    this.onIdle();
                }
            );

            return;
        }

        let newOffset = this.state.animation.totalOffset * howFarAlong;

        if (this.props.animationEaseFunction) {
            newOffset = this.props.animationEaseFunction(
                this.props.animationDuration! - timeUntilEnd,
                this.state.animation.totalOffset,
                -this.state.animation.totalOffset,
                this.props.animationDuration!
            );
        }

        // There's no point setting state for a change that is too small to be visible
        // on screen. So we round the pixel value by window.pixelDeviceRatio:
        newOffset = Math.round(newOffset * window.devicePixelRatio) / window.devicePixelRatio;

        // Then check if that rounded number equals our current value. If it does, we set
        // the animation time to run again after a frame request, to see if the number has
        // increased enough by then to warrant re-drawing.
        if (newOffset === this.state.animation.currentOffset) {
            this.animationTimer = requestAnimationFrame(this.updateAnimation);
            return;
        }

        // setState() doesn't do a deep merge, so we'll just set the currentOffset on
        // our existing object. Ideally we'd use Object.assign() to create a new one, but I'm
        // concerned about the performance implications (and this works anyway)

        this.state.animation.currentOffset = newOffset;

        this.setState({
            animation: this.state.animation
        });
    }

    isAtScrollEnd() {
        if (this.props.addNewItemsTo === AddNewItemsTo.Top) {
            return this.state.currentScrollPosition <= 0;
        }

        return this.state.currentScrollPosition >= this.state.totalHeight - this.dummyScrollContainer.clientHeight;
    }

    async scrollToEnd() {
        let newItems = await this.itemBuffer.load(this.props, {
            currentBufferOffset: this.props.numberOfItems - this.props.itemBufferSize
        });

        if (this.props.addNewItemsTo === AddNewItemsTo.Top) {
            this.setState({
                currentBufferOffset: this.props.numberOfItems - this.props.itemBufferSize,
                currentScrollPosition: 0,
                itemPositions: new Map<number, HeightAndPosition>(),
                itemBuffer: newItems
            });
        } else {
            let newItemPositions = this.state.itemPositions;
            let newBufferOffset = this.props.numberOfItems - this.props.itemBufferSize;

            if (newBufferOffset > this.state.currentBufferOffset + this.props.itemBufferSize) {
                // Last minute hack here so need to revisit the logic. But clearing out positions
                // entirely doesn't seem to work correctly when some of the items in our buffer
                // will be re-used.

                newItemPositions = new Map();
            }

            this.setState({
                currentBufferOffset: this.props.numberOfItems - this.props.itemBufferSize,
                currentScrollPosition: this.state.totalHeight - this.dummyScrollContainer.clientHeight,
                itemPositions: newItemPositions,
                itemBuffer: newItems
            });
        }
    }

    itemRendered(newItemIndex: number, width: number, height: number) {
        // We receive this callback for many items at once - wrapping setState in a callback
        // means that the state stays consistent. We add the entries to our pending collection,
        // then on componentDidUpdate(), we check and run calculatePendingRenders(). This means
        // that the calculation code only runs once for each batch of rendered items.

        this.setState((state: PerformanceScrollViewState) => {
            state.pendingItemRenders.set(newItemIndex, height);

            return {
                pendingItemRenders: state.pendingItemRenders
            };
        });
    }


    //TODO: completely understand:
    //


    calculatePendingRenders() {
        console.info("VIEW: Calculating item positions with", this.state.pendingItemRenders.size, "pending renders");
        // Make a new map for item positions. We'll adjust the existing values and add
        // them to this new map.
        let newPositions = new Map<number, HeightAndPosition>();

        let newScrollPosition = this.state.currentScrollPosition;

        let newAnimation: ScrollViewAnimation | undefined = undefined;

        if (this.props.animationDuration) {
            newAnimation = {
                currentOffset: 0,
                totalOffset: 0,
                endTime: Date.now() + this.props.animationDuration
            };
        }

        let currentPosition = 0;

        // Maps don't sort their keys, unfortunately. So we have to do that. Maybe there
        // is a performance optimisation to be done here?

        let sortedKeys = Array.from(this.state.itemPositions.keys());

        // We then add our new index in there, so we can save our data at the appropriate
        // point. It might already be in there if it's an item we've rendered before now.

        for (let newKey of this.state.pendingItemRenders.keys()) {
            if (sortedKeys.indexOf(newKey) === -1) {
                sortedKeys.push(newKey);
            }
        }

        sortedKeys = sortedKeys.sort((a, b) => a - b);
        // let lastItemIndex = sortedKeys[sortedKeys.length - 1];

        if (this.props.addNewItemsTo === AddNewItemsTo.Top) {
            // If we're adding new items to the top, we want to reverse the order
            // of our key array so that we render the last index first.

            sortedKeys = sortedKeys.reverse();
            // lastItemIndex = sortedKeys[0];
        }

        sortedKeys.forEach(currentIndex => {
            let existingValue = this.state.itemPositions.get(currentIndex);
            let pendingHeight = this.state.pendingItemRenders.get(currentIndex);

            if (currentIndex === this.props.startIndex && this.state.isInitialRenderLoop) {
                // If this is the first render then we need to set our initial scroll position.
                if (!pendingHeight) {
                    throw new Error("Pending height should always exist on initial render");
                }

                if (this.props.addNewItemsTo === AddNewItemsTo.Top) {
                    newScrollPosition = currentPosition;
                } else {
                    newScrollPosition = currentPosition + pendingHeight - this.dummyScrollContainer.clientHeight;
                }
            }

            if (pendingHeight) {
                // If this is the index for a new item, there isn't any existing
                // data to check. So we set a new object with the height returned.

                newPositions.set(currentIndex, {
                    position: currentPosition,
                    height: pendingHeight
                });

                if (currentPosition <= newScrollPosition && this.state.isInitialRenderLoop === false) {
                    // If the item we are adding is above our current scroll position it's going
                    // to result in the visible items being shunted downwards. We need to accommodate
                    // that by shifting our scroll position accordingly, so the user sees no visible
                    // change.

                    if (existingValue) {
                        // Slightly confusing here, but if there is an existing value AND a pending
                        // value that means we've rendered a new item into the existing index. Usually
                        // that means we've replaced a "load more" indicator with an actual item. We need
                        // to adjust the scroll position back by the previous amount before we add the
                        // new amount.
                        newScrollPosition -= existingValue.height;
                    }

                    newScrollPosition += pendingHeight;
                }

                // BUT if it's a new item and we're at the end of our scroll position we actually DO
                // want it to automatically come into view.
                if (this.isAtScrollEnd() === true && this.state.newlyAddedIndexes.indexOf(currentIndex) > -1) {
                    if (this.props.addNewItemsTo === AddNewItemsTo.Top) {
                        newScrollPosition -= pendingHeight;
                        if (newAnimation) {
                            newAnimation.totalOffset -= pendingHeight;
                        }
                    } else {
                        newScrollPosition += pendingHeight;
                        if (newAnimation) {
                            newAnimation.totalOffset += pendingHeight;
                            newAnimation.currentOffset += pendingHeight;
                        }
                    }
                }

                currentPosition += pendingHeight;

                return;
            }

            if (!existingValue) {
                throw new Error("There is neither a pending height nor existing height for index " + currentIndex);
            }

            // Otherwise, we use our existing cached data to append to the current
            // position.

            if (existingValue.position === currentPosition) {
                // Maybe a slight performance increase here as we're reusing
                // an existing object rather than create a new one when the
                // position hasn't changed.
                newPositions.set(currentIndex, existingValue);
            } else {
                newPositions.set(currentIndex, {
                    height: existingValue.height,
                    position: currentPosition
                });
            }

            currentPosition += existingValue.height;
        });

        if (currentPosition < this.dummyScrollContainer.clientHeight) {
            // This is kind of a crappy catch, but if our content is smaller than
            // the viewport, we don't want to try to adjust scroll position,
            // because it does weird things if we do.
            newScrollPosition = 0;
        }

        if (this.state.isInitialRenderLoop && this.props.addNewItemsTo === AddNewItemsTo.Bottom) {
            newScrollPosition = currentPosition + newScrollPosition;
        }

        if (newAnimation && newAnimation.totalOffset === 0) {
            newAnimation = undefined;
        }

        let newState = {
            itemPositions: newPositions,
            totalHeight: currentPosition,
            currentScrollPosition: newScrollPosition,
            pendingItemRenders: new Map(),
            isInitialRenderLoop: false,
            newlyAddedIndexes: [],
            animation: newAnimation
        };

        this.setState(newState);
    }

    invalidateHeight(itemIndex: number) {
        this.state.itemPositions.delete(itemIndex);
    }

    getCurrentVisibleItemBounds() {
        let topVisibleIndex = -1;
        let bottomVisibleIndex = -1;

        for (let [key, { height, position }] of this.state.itemPositions) {
            if (position + height > this.state.currentScrollPosition && topVisibleIndex === -1) {
                // This item is visible on screen, and it's the first one we've encountered
                topVisibleIndex = key;
            }
            bottomVisibleIndex = key;
            if (position + height > this.state.currentScrollPosition + this.dummyScrollContainer.clientHeight) {
                // If the bottom of this item is off the bottom of the screen then that's our
                // final index - so break here.
                break;
            }
        }

        return {
            top: topVisibleIndex,
            bottom: bottomVisibleIndex
        };
    }

    shouldResetPendingItemCount() {
        if (this.state.currentBufferOffset < this.props.numberOfItems - this.props.itemBufferSize) {
            return false;
        }
        return this.state.numberOfNewItems > 0 && this.isAtScrollEnd();
    }

    async onIdle() {
        // debugger;
        if (this.state.animation) {
            // If there is an animation currently running we don't want to mess with
            // our item collection. When the animation is complete it'll call onIdle
            // by itself.
            return;
        }
        let { top, bottom } = this.getCurrentVisibleItemBounds();
        let mid = Math.round(top + (bottom - top) / 2);

        let bufferSize = Math.min(this.props.itemBufferSize, this.props.numberOfItems);
        let halfBuffer = Math.ceil(bufferSize / 2);

        let newTop = mid - halfBuffer;
        if (newTop < 0) {
            newTop = 0;
        }

        if (newTop > 0 && newTop < bufferSize) {
            // If we don't yet have enough items to fill the buffer, setting an offset
            // causes some weird rendering problems. There's also no need to do it.
            newTop = 0;
        }

        if (newTop === this.state.currentBufferOffset) {
            console.info("VIEW: No index change after scroll event finished");
            if (this.shouldResetPendingItemCount()) {
                this.setState({
                    numberOfNewItems: 0
                });
            }
            return;
        }

        console.info("VIEW: Index change after scroll, from", this.state.currentBufferOffset, "to", newTop);

        let newItems = await this.itemBuffer.load(this.props, {
            currentBufferOffset: newTop
        });

        let newMap = new Map<number, HeightAndPosition>();

        // This doesn't feel quite right, but we remove items that now fall outside of our
        // buffer bounds. When we do, we need to adjust the current scroll position so that
        // the transition is seamless to users.

        let adjustedScrollPosition = this.state.currentScrollPosition;

        this.state.itemPositions.forEach((val, key) => {
            if (key <= newTop) {
                if (this.props.addNewItemsTo === AddNewItemsTo.Bottom) {
                    adjustedScrollPosition -= val.height;
                }
                return;
            }
            if (key >= newTop + newItems.length) {
                if (this.props.addNewItemsTo === AddNewItemsTo.Top) {
                    adjustedScrollPosition -= val.height;
                }
                return;
            }

            newMap.set(key, val);
        });

        this.setState({
            currentBufferOffset: newTop,
            itemBuffer: newItems,
            itemPositions: newMap,
            currentScrollPosition: adjustedScrollPosition,
            numberOfNewItems: this.shouldResetPendingItemCount() ? 0 : this.state.numberOfNewItems
        });
    }


    recalculatePositions() {
        // If the element size has changed, we need to redraw all the elements.
        // In order to do that, we convert our current positions back to pending
        // positions, then componentDidUpdate() will redraw them.

        let newPending = new Map<number, number>();
        (window as any).itemPositions = this.state.itemPositions;

        this.state.itemPositions.forEach((val, key) => {
            newPending.set(key, val.height);
        });

        this.setState({
            itemPositions: new Map(),
            pendingItemRenders: newPending
        });
    }
}
