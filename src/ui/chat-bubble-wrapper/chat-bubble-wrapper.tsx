import * as React from "react";
import {FrameFunctions} from "../frame/frame";
import {ChatBubble, ChatBubbleImage, ChatBubbleLink, ChatBubblePollInt} from "../chat-bubble/chat-bubble";
import {Chapter} from "../../interfaces/script";
import * as styles from "./chat-bubble-wrapper.css";
import {db, saveTextInput} from "../../bridge/database";

export interface ChatBubbleWrapperProp {
    text?: string;
    time: number;
    images?: ChatBubbleImage[];
    link?: ChatBubbleLink;
    chapterIndicator?: Chapter;
    silent?: boolean;
    notificationOnlyText?: string;
    poll?: ChatBubblePollInt;
    onResize?: () => void;
    frameFunctions?: FrameFunctions;
    projectId?: string;
}

export interface ChatBubbleWrapperState {
    answerBubbleIsActive: boolean;
    inputText: string;
    bubbleSizeChanged: boolean;
}

export class ChatBubbleWrapper extends React.Component<ChatBubbleWrapperProp, ChatBubbleWrapperState> {

    constructor(props) {
        super(props);
        this.state = {
            answerBubbleIsActive: false,
            inputText: '',
            bubbleSizeChanged: false
        }
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleSendClick = this.handleSendClick.bind(this);
    }

    handleInputChange(userTextInput) {
        console.log('is handled')
        this.setState({inputText: userTextInput})
    }

    scrollToBottom(){
        let elementx = window!.document!.querySelector('.chat-window')!.lastChild! as HTMLDivElement;
        elementx.scrollTop! = elementx.scrollHeight! - elementx.clientHeight!
        console.log('lala')
    }

    handleSendClick(e) {

        this.setState({
            answerBubbleIsActive: true,
            bubbleSizeChanged: true
        });
        setTimeout(this.scrollToBottom,30)
        saveTextInput(this.props.poll!.pollID!, this.props.frameFunctions!.cacheName, db, this.state.inputText)

        e.preventDefault()
    }


    render() {
        if (!this.state.answerBubbleIsActive) {

            let sendurl = new URL('bundles/example-podcast/send.png', document.location.href)
            return (
                <div className={styles.chatBubbleWrapper}>
                    <ChatBubble className={styles.bubbleTextInput}  {...this.props} onInputChange={this.handleInputChange}
                                userInput={this.state.inputText}/>
                    <div className={styles.buttonWrapper}>
                     {/*using onFocus as an eventHandler and not on click is a hack cause otherwise the button does only focus not reacting on clck*/}
                        <button type='submit' value="Submit" className={styles.button}  onFocus={(e)=>{this.handleSendClick(e)}}>
                            <img src={sendurl.href} className={styles.buttonImageStyle}/>
                        </button>
                        {/*<button className={styles.button} onClick={()=>{this.props.frameFunctions!.pause(); this.props.frameFunctions!.toggleControls()}}>cancel</button>*/}
                    </div>
                </div>
            )
        } else {
            return (

                <div>

                        <ChatBubble  className={styles.bubbleRight} time={this.props.time} text={this.state.inputText} userInput={this.state.inputText}
                                    isUserChatBubble={true} onInputChange={this.handleInputChange}/>



                        <ChatBubble className={styles.bubbleLeft} time={this.props.time} text={this.props.poll!.followUp}
                        />

                </div>

            )
        }
    }

    componentDidUpdate(){
        if(this.state.answerBubbleIsActive && this.state.bubbleSizeChanged) {
            if (this.props.poll!.choices.length == 0) {
                setTimeout(() => {
                    this.props.onResize!();
                }, 0);


            }
            this.setState({
                bubbleSizeChanged: false
            });
        }
        this.props.onResize!();
        let elementx = window!.document!.querySelector('.chat-window')!.lastChild! as HTMLDivElement;
        elementx.scrollTop! = elementx.scrollHeight! - elementx.clientHeight!
    }

}
