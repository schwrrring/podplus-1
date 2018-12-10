import * as styles from "./chat-bubble.css";
import * as React from "react";
import {Component} from "react";
import {getPhotoSwipeContainer, PhotoSwipe} from "../photoswipe/photoswipe";
import {Chapter, makeRelative} from "../../interfaces/script";
import {showOrHideContactBox} from "../contact-box/contact-box";
import {showOrHideSideMenu} from "../side-menu/side-menu";
import {sendEvent} from "../../util/analytics";
import {PollUserChoice} from "../poll-user-choice/poll-user-choice";
import {PollUserTextinput} from "../poll-user-textinput/poll-user-textinput";
import FrameContext from "../../contexts/frame-context"
import ScrollViewItemContext from "../performance-scroll-view/scroll-view-item-context";
import {DatawrapperBubble} from "../datawrapper-bubble/datawrapper-bubble";

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
    activateAnswerBubble?: (string) => void;

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

export interface OpenQuestion {
    question: string;
    followUp: string;
    pollID: string;
    showResults: boolean;
}

export interface ChatBubbleProperties {
    text?: string;
    className?: string;
    time: number;
    images?: ChatBubbleImage[];
    link?: ChatBubbleLink;
    chapterIndicator?: Chapter;
    silent?: boolean;
    notificationOnlyText?: string;
    multipleChoice?: ChatBubblePollInt;
    type?: string;
    openQuestion?: OpenQuestion;
    projectId?: string;
    userInput?: string;
    onInputChange?: any;
    isUserChatBubble?: boolean; // TODO: implement als ersatz fuer den is Activted filter, der bestimmt, ob die bubble nach rehts oder nicht nach rechts rutscht.
    dataWrapper?: boolean;

}

interface ChatBubbleState {
    touched: boolean;
    expanded: boolean;
    pollSent: number;
    chatBubbleClassName: string;
    parentClassChanged?: boolean;
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
        <div key="imaged" style={{maxHeight: "60vh"}} className={styles.bubbleImageContainer}>
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

function renderOpenQuestion(bindTo: ChatBubble) {
    if (!bindTo.props.openQuestion) {
        return null
    }
    return (

        <ScrollViewItemContext.Consumer key={"userTextInput"}>
            {viewItemContext =>
                <FrameContext.Consumer>
                    {frame =>
                        <PollUserTextinput
                            question={bindTo.props!.openQuestion!.question}
                            followUp={bindTo.props!.openQuestion!.followUp}
                            pollID={bindTo.props!.openQuestion!.pollID}
                            onResize={viewItemContext.onResize}
                            frameFunctions={frame}
                            key={"userTextInput"}
                            userInput={bindTo.props.userInput}
                            onInputChange={bindTo.props.onInputChange}
                        />
                    }
                </FrameContext.Consumer>}
        </ScrollViewItemContext.Consumer>
    )
}

function renderMultipleChoice(bindTo: ChatBubble) {
    if (!bindTo.props.multipleChoice) {
        return null
    }
    return (
        <ScrollViewItemContext.Consumer key={"openQuestion"}>
            {viewItemContext =>
                <PollUserChoice
                    question={bindTo.props!.multipleChoice!.question}
                    choices={bindTo.props!.multipleChoice!.choices}
                    followUp={bindTo.props!.multipleChoice!.followUp}
                    pollID={bindTo.props!.multipleChoice!.pollID}
                    showResults={bindTo.props!.multipleChoice!.showResults}
                    onResize={viewItemContext.onResize!}
                    key={"multipleChoice"}
                    changeBubbleClass={bindTo.changeClassName}
                />}
        </ScrollViewItemContext.Consumer>
    )

}

function renderDatawrapperBubble(bindTo: ChatBubble) {
    if (!bindTo.props.dataWrapper) {
        return null
    }else{
        return <DatawrapperBubble/>
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
                key="link2"
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
            key="link3"
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
            pollSent: 0,
            chatBubbleClassName: 'bubble',
        };
        this.maybeOpenPhotoSwipe = this.maybeOpenPhotoSwipe.bind(this);
        this.maybeClosePhotoSwipe = this.maybeClosePhotoSwipe.bind(this);
        this.changeClassName = this.changeClassName.bind(this);
    }

    changeClassName(className: string) {
        this.setState({
            chatBubbleClassName: className,
        })

    }

    render() {
        let className = styles[this.state.chatBubbleClassName];
        if (this.props.className) {
            className = this.props.className;
        }

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
            renderOpenQuestion(this),
            renderMultipleChoice(this),
            renderDatawrapperBubble(this),
        ];

        if (elements.some(el => el !== null) === false) {
            return null;
        }

        let containerClassName = styles.bubbleContainerLeft;

        if (this.props.link) {
            containerClassName += " " + styles.linkContainer;
        }


        if (this.props.openQuestion) {
            containerClassName = styles.pollContainer;
            return (
                <div className={containerClassName} ref={el => (this.containerElement = el)}>
                    <div className={className} id={'scrollWrapper'} onTouchStart={this.setTouch}
                         onTouchEnd={this.setTouch}>
                        {elements}
                    </div>
                </div>
            );
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
