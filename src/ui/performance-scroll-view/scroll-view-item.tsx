import {Component} from "react";
import * as React from "react";

const scrollViewItemCSS: React.CSSProperties = {
    position: "absolute",
    transform: "translate3d(-100%,0,0)",
    left: 0,
    width: "100%"
    // background: process.env.NODE_ENV == "development" ? "red" : undefined
};

export interface ScrollViewItemProperties {
    onRender: (index: number, width: number, height: number) => void;
    itemIndex: number;
    y?: number;
    debugId?: string;
}

export class ScrollViewItem extends Component<ScrollViewItemProperties, any> {
    wrapperElement: HTMLDivElement;

    constructor(props) {
        super(props);

        this.onResize = this.onResize.bind(this);
    }

    onResize (){
        let size = this.wrapperElement.getBoundingClientRect();
        this.props.onRender(this.props.itemIndex, Math.ceil(size.width), Math.ceil(size.height));
    }

    render() {
        let style = scrollViewItemCSS;

        if (this.props.y !== undefined) {
            style = Object.assign({}, style, {
                transform: `translate3d(0,${this.props.y}px,0)`
            });
        }

        const childWithProp = React.Children.map(this.props.children, (child) => {
            return React.cloneElement(child as React.ReactElement<any>, {onResize: this.onResize});
        });

        return (
            <div id={this.props.debugId} ref={el => (this.wrapperElement = el!)} style={style}>
                {childWithProp}
            </div>
        );
    }
    // hierherkommt die Groesse!!!!!!
    componentDidMount() {
        let size = this.wrapperElement.getBoundingClientRect();
        this.props.onRender(this.props.itemIndex, Math.ceil(size.width), Math.ceil(size.height));
    }

    shouldComponentUpdate(nextProps: ScrollViewItemProperties) {
        return nextProps.y !== this.props.y;
    }
}
