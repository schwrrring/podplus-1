import * as styles from "./chat-bubble.css";
import * as React from "react";
import {Component} from "react";
import {getPhotoSwipeContainer, PhotoSwipe} from "../photoswipe/photoswipe";
import {runServiceWorkerCommand} from "service-worker-command-bridge";
import {Chapter, makeRelative} from "../../interfaces/script";
import {showOrHideContactBox} from "../contact-box/contact-box";
import {showOrHideSideMenu} from "../side-menu/side-menu";
import {sendEvent} from "../../util/analytics";
import {PollUserChoice} from "../poll-user-choice/poll-user-choice";
import {PollUserTextinput} from "../poll-user-textinput/poll-user-textinput";

// tryouts
import {httpGet} from "../../bridge/httpRequest";
import {db, createCounter, incrementCounter, getCount} from "../../bridge/database";

export enum BubbleType {
    text = "text"
}

export interface ChatBubbleImage {
    url: string;
    width: number;
    height: number;
    caption: string;
    video?: boolean;
}

export interface ChatBubblePollProperties {
    question: string;
    choices: string[];
    followUp?: string;
    pollID: string;
    onResize?: ()=> void;
}


export interface ChatBubblePollState {
    pollSent: boolean;
    databaseRefs: any[];
    value: any;
    showInputButtons: boolean;
}

export interface ChatBubbleLink {
    title: string;
    url: string;
    image?: string;
    domain: string;
    specialAction?: string;
}

export interface ChatBubblePollInt {
    question: string;
    choices: string[];
    followUp: string;
    pollID: string;
    showResults: boolean;
}

export interface ChatBubbleProperties {
    text?: string;
    time: number;
    images?: ChatBubbleImage[];
    link?: ChatBubbleLink;
    chapterIndicator?: Chapter;
    silent?: boolean;
    notificationOnlyText?: string;
    poll?: ChatBubblePollInt;
    onResize?: ()=> void;
}

interface ChatBubbleState {
    touched: boolean;
    expanded: boolean;
    pollSent: number;
}

function setExpandedState(target: ChatBubble, toValue: boolean) {
    target.setState({
        expanded: toValue
    });
}

function renderImage(bindTo: ChatBubble) {
    if (!bindTo.props.images || bindTo.props.images.length === 0) {
        return null;
    }

    let {width, height} = bindTo.props.images[0];

    let containerStyles: React.CSSProperties = {
        paddingTop: height / width * 100 + "%",
        width: "100%",
        position: "relative",
        maxHeight: "60vh"
    };

    let imageStyles: React.CSSProperties = {
        maxWidth: "100%",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        position: "absolute"
        // maxHeight: "60vh"
    };

    let gallery: JSX.Element | undefined = undefined;

    if (bindTo.state && bindTo.state.expanded === true) {
        var items = bindTo.props.images.map(image => {
            if (image.video === true) {
                return {
                    html: `<video src="${image.url}" class="${
                        styles.expandedVideo
                        }" playsinline autoplay controls/>`,
                    title: image.caption || ""
                };
            }

            let title = image.caption;

            return {
                src: image.url,
                w: image.width,
                h: image.height,
                title: title
            };
        });

        gallery = <PhotoSwipe items={items} onClose={() => setExpandedState(bindTo, false)}/>;
    }

    let img: JSX.Element;
    if (bindTo.props.images[0].video === true) {
        img = (
            <video
                src={bindTo.props.images[0].url}
                style={imageStyles}
                autoPlay={false}
                muted={false}
                playsInline={true}
                controls={true}
            />
        );
    } else {
        img = <img src={bindTo.props.images[0].url} style={imageStyles}/>;
    }

    return (
        <div key="image" style={{maxHeight: "60vh"}} className={styles.bubbleImageContainer}>
            <div
                style={containerStyles}
                onClick={() => {
                    setExpandedState(bindTo, true);
                    sendEvent("Web Browser", "Image Expand", bindTo.props.images![0].url);
                }}
            >
                {img}
                {gallery}
            </div>
        </div>
    );
}

function renderText(bindTo: ChatBubble) {
    if (!bindTo.props.text) {
        return null;
    }
    return (
        <div key="text" className={styles.bubbleTextPadding}>
            <div className={styles.bubbleText} ref={el => (bindTo.textElement = el)}>
                {bindTo.props.text}
            </div>
        </div>
    );
}

function renderPoll(bindTo: ChatBubble) {
    if (!bindTo.props.poll) {
        return null;
    }
    if(bindTo.props.poll.choices.length > 0) {
        return (<PollUserChoice
            question={bindTo.props.poll.question}
            choices={bindTo.props.poll.choices}
            followUp={bindTo.props.poll.followUp}
            pollID={bindTo.props.poll.pollID}
            showResults={bindTo.props.poll.showResults}
            onResize = { bindTo.props.onResize!}
            key = {"poll"}
        />)
    }
    else {

        return (<PollUserTextinput
            question={bindTo.props.poll.question}
            choices={bindTo.props.poll.choices}
            followUp={bindTo.props.poll.followUp}
            pollID={bindTo.props.poll.pollID}
            onResize = {bindTo.props.onResize}
            key = {"poll"}
        />)
    }
}

function renderLink(props: ChatBubbleProperties) {
    if (!props.link) {
        return null;
    }
    if (props.link.specialAction === "open-contact-menu") {
        return (
            <div
                key="link"
                onClick={() => showOrHideContactBox("Post-episode CTA")}
                className={styles.bubbleText + " " + styles.bubbleLink}
            >
                {props.link.title}
            </div>
        );
    }

    if (props.link.specialAction === "open-side-menu") {
        return (
            <div
                key="link"
                onClick={showOrHideSideMenu}
                className={styles.bubbleText + " " + styles.bubbleLink}
            >
                {props.link.title}
            </div>
        );
    }

    // let linkImage: JSX.Element | undefined;
    // if (props.link.image) {
    //     linkImage = <img src={props.link.image} className={styles.bubbleLinkImage} />;
    // }

    return (
        <a
            onClick={() => {
                sendEvent("Web Browser", "Link Click", props.link!.url);
            }}
            key="link"
            target="_blank"
            className={styles.bubbleText + " " + styles.bubbleLink}
            href={props.link.url}
        >
            {props.link.title}
            {/* <div className={styles.bubbleLinkImageContainer}>{linkImage}</div> */}
        </a>
    );
}

function renderChapterIndicator(chapter: Chapter | undefined) {
    if (!chapter) {
        return null;
    }
    return (
        <div key={"chapter-indicator"}>
            <div className={styles.chapterIndicatorText}>{chapter.name}</div>
            <div className={styles.chapterIndicatorLine}/>
        </div>
    );
}

export class ChatBubble extends Component<ChatBubbleProperties, ChatBubbleState> {
    containerElement: HTMLDivElement | null;
    textElement: HTMLDivElement | null;

    constructor(props) {
        super(props);
        this.setTouch = this.setTouch.bind(this);
        this.state = {
            touched: false,
            expanded: false,
            pollSent: 0
        };
        this.maybeOpenPhotoSwipe = this.maybeOpenPhotoSwipe.bind(this);
        this.maybeClosePhotoSwipe = this.maybeClosePhotoSwipe.bind(this);
    }

    render() {
        let className = styles.bubble;

        if (this.props.chapterIndicator) {
            className = styles.chapterIndicator;
        }

        if (this.props.images && this.props.images.length > 0) {
            className += " " + styles.bubbleFullWidth;
        }

        if (this.state.touched) {
            className += " " + styles.bubbleTouch;
        }

        let elements = [
            renderChapterIndicator(this.props.chapterIndicator),
            renderImage(this),
            renderText(this),
            renderLink(this.props),
            renderPoll(this),
        ];

        if (elements.some(el => el !== null) === false) {
            return null;
        }

        let containerClassName = styles.bubbleContainer;

        if (this.props.link) {
            containerClassName += " " + styles.linkContainer;
        }

        if (this.props.poll) {
            containerClassName += " " + styles.pollContainer;
            className += " " + styles.bubbleFullWidth;
        }

        return (
            <div className={containerClassName} ref={el => (this.containerElement = el)}>
                <div className={className} onTouchStart={this.setTouch} onTouchEnd={this.setTouch}>
                    {elements}
                </div>
            </div>
        );
    }

    maybeOpenPhotoSwipe(e: ServiceWorkerMessageEvent) {
        if (e.data.command !== "podmod.openphoto") {
            return;
        }
        if (e.data.url !== this.props.images![0].url) {
            return;
        }

        this.setState({
            expanded: true
        });
    }

    maybeClosePhotoSwipe(e: ServiceWorkerMessageEvent) {
        console.log("FIRING LISTENER");
        if (e.data.command !== "podmod.closephoto" || this.state.expanded === false) {
            return;
        }
        console.info("Closing photo in response to postMessage");
        this.setState({
            expanded: false
        });
    }

    componentDidMount() {
        if (this.textElement && this.containerElement) {
            // If it's just a text bubble it doesn't automatically change width according to the size
            // of the text container. We have to manually force it to do so.
            // this.containerElement.style.width = this.textElement.getBoundingClientRect().width + "px";
        }

        if (this.props.images && this.props.images.length > 0 && "serviceWorker" in navigator) {
            window.navigator.serviceWorker.addEventListener("message", this.maybeOpenPhotoSwipe);
        }
    }

    componentWillUnmount() {
        if (this.props.images && this.props.images.length > 0 && "serviceWorker" in navigator) {
            window.navigator.serviceWorker.removeEventListener("message", this.maybeOpenPhotoSwipe);
            window.navigator.serviceWorker.removeEventListener("message", this.maybeClosePhotoSwipe);
        }
    }

    componentDidUpdate(oldProps, oldState: ChatBubbleState) {
        if (!this.props.images || this.props.images.length === 0 || "serviceWorker" in navigator === false) {
            return;
        }
        if (oldState.expanded === false && this.state.expanded === true) {
            console.log("SETTING LISTENER");
            window.navigator.serviceWorker.addEventListener("message", this.maybeClosePhotoSwipe);
        } else if (oldState.expanded === true && this.state.expanded === false) {
            console.log("REMOVING LISTENER");
            window.navigator.serviceWorker.removeEventListener("message", this.maybeClosePhotoSwipe);
        }
    }

    setTouch(e: React.TouchEvent<HTMLDivElement>) {
        if (e.type === "touchstart") {
            this.setState({touched: true});
        } else {
            this.setState({touched: false});
        }
    }
}
