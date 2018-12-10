import * as styles from "./datawrapper-bubble.css";
import * as React from "react";
import {Component} from "react";
import Iframe from 'react-iframe'


interface DatawrapperBubbleProperties {

}

interface DatawrapperBubbleState {

}

declare global {
    interface Window {
        datawrapper: any
    }
}

export class DatawrapperBubble extends Component<DatawrapperBubbleProperties, DatawrapperBubbleState> {
    constructor(props) {
        super(props);
        this.state = {}

    }

    render() {
        let divStyle = {
            width: '0',
            minWidth: '100%'
        }
        return (
            <div key="text" className={styles.bubbleTextPadding}>
                <div className={styles.bubbleText}>
                    <iframe id="datawrapper-chart-NkCN6" src="//datawrapper.dwcdn.net/NkCN6/1/" scrolling="no"
                            frameBorder="0"
                            style={divStyle}
                            height="630"/>
                </div>
            </div>

        )
    }

    componentDidMount() {
        if ("undefined" == typeof window.datawrapper) window.datawrapper = {};

        window.datawrapper["NkCN6"] = {}, window.datawrapper["NkCN6"].embedDeltas = {
            "100": 764,
            "200": 697,
            "300": 655,
            "400": 655,
            "500": 630,
            "700": 630,
            "800": 630,
            "900": 630,
            "1000": 630
        }, window.datawrapper["NkCN6"].iframe = document.getElementById("datawrapper-chart-NkCN6"), window.datawrapper["NkCN6"].iframe.style.height = window.datawrapper["NkCN6"].embedDeltas[Math.min(1e3, Math.max(100 * Math.floor(window.datawrapper["NkCN6"].iframe.offsetWidth / 100), 100))] + "px", window.addEventListener("message", function (a) {
            if ("undefined" != typeof a.data["datawrapper-height"]) for (var b in a.data["datawrapper-height"]) if ("NkCN6" == b) window.datawrapper["NkCN6"].iframe.style.height = a.data["datawrapper-height"][b] + "px"
        });
    }

}

