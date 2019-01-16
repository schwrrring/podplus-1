import * as styles from "./i-frame-bubble.css";
import * as React from "react";
import {Component} from "react";

// TODO: nicht dangerouslSetInnerhtml
interface DatawrapperBubbleProperties {
    iframe: string
}

interface DatawrapperBubbleState {

}

export class IFrameBubble extends Component<DatawrapperBubbleProperties, DatawrapperBubbleState> {
    constructor(props) {
        super(props);1
        this.state = {}

    }
    render() {
        return (
            <div key="text" className={styles.bubbleTextPadding}>
                <div className={styles.bubbleText}>
                    <div className="content" dangerouslySetInnerHTML={{__html: this.props.iframe}}></div>
                </div>
            </div>

        )
    }
}