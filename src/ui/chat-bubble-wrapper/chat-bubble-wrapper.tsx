import * as React from "react";
import {FrameFunctions} from "../frame/frame";
import {ChatBubble, ChatBubbleImage, ChatBubbleLink, ChatBubblePollInt} from "../chat-bubble/chat-bubble";
import {Chapter} from "../../interfaces/script";

export interface ChatBubbleWrapperProp {
    text?: string;
    time: number;
    images?: ChatBubbleImage[];
    link?: ChatBubbleLink;
    chapterIndicator?: Chapter;
    silent?: boolean;
    notificationOnlyText?: string;
    poll?: ChatBubblePollInt;
    onResize?: ()=> void;
    frameFunctions?: FrameFunctions;
    pausePlayer?: () => void;
    startPlayer?: () => void;
    projectId?: string;
}

export interface ChatBubbleWrapperState {
    answerBubbleIsActive: boolean;

}

export class ChatBubbleWrapper extends React.Component<ChatBubbleWrapperProp, ChatBubbleWrapperState> {


    constructor(props) {
        super(props);
        this.state = {
            answerBubbleIsActive: false
        }
        this.activateAnswerBubble= this.activateAnswerBubble.bind(this);
    }
    activateAnswerBubble(message: String){

       console.log(message)
    }

    render(){
        if(!this.state.answerBubbleIsActive) {
            return <div><ChatBubble {...this.props}
            activateAnswerBubble={this.activateAnswerBubble}/><ChatBubble {...this.props} activateAnswerBubble={this.activateAnswerBubble}/>
            </div>
        }
    }
}
