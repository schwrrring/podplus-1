import * as React from 'react';
import ReactDOM from 'react-dom';
import ReactSwipe from 'react-swipe';

export const Carousel = (props) => {
    let reactSwipeEl;

    return (
        <div>
            <ReactSwipe
                className="carousel"
                swipeOptions={{continuous: false}}
                ref={el => (reactSwipeEl = el)}
            >
                {props.children}
            </ReactSwipe>
            <button onClick={() => reactSwipeEl.next()}>Next</button>
            <button onClick={() => reactSwipeEl.prev()}>Previous</button>
        </div>
    );
};