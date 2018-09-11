import * as styles from "./poll-user-textinput.css";
import * as React from "react";
import {findDomNode} from "react-dom";
import {ChangeEvent, Component, CSSProperties} from "react";
import {ChatBubblePollProperties, ChatBubblePollState} from "../chat-bubble/chat-bubble";
import {db, saveTextInput} from "../../bridge/database";
import {FrameFunctions} from "../frame/frame";


export interface PollUserTextinputProperties {
    question: string;
    followUp?: string;
    pollID: string;
    onResize?: () => void;
    projectId?: string;
    frameFunctions?: FrameFunctions;
    userInput?: string;
    onInputChange: any; // TODO: refactor, add function and argumentTypes
}

export interface PollUserTextinputState {

}


export class PollUserTextinput extends Component<PollUserTextinputProperties, PollUserTextinputState> {
    textAreaElement: HTMLTextAreaElement | null;

    constructor(props) {
        super(props);
        this.autoGrow = this.autoGrow.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.toggleControls = this.toggleControls.bind(this);
    }


    componentDidMount() {
        // dirty dirty hack to make the textArea available
        document.getElementById(this.props.pollID)!.parentElement!.parentElement!.parentElement!.parentElement!.style.zIndex = "1";
    }

    height = 1;
    autoGrow(element) {
            element.style.height = "auto";
            // element.style.width = "auto";
            element.style.height = (element.scrollHeight) + "px";
            // element.style.width = (element.scrollWidth) + "px";
            this.props.onResize!();
    }

    handleChange(e){
        this.props.onInputChange(e.target.value)
        this.props.onResize!();
    }

    toggleControls(){
        this.props.frameFunctions!.toggleControls();
    }

    render() {
        let retVal = (
            <div className={styles.pollUserChoicePadding} id={this.props.pollID}>
                <div className={styles.bubblePollButtonsContainer}>
                    <textarea ref={el => (this.textAreaElement = el)}
                              onChange={this.handleChange}
                              className={styles.userInputArea}
                              placeholder={"Nachricht schreiben..."}
                              autoFocus={false}
                              onBlur={this.toggleControls}
                              onFocus={this.toggleControls}
                              rows={1}
                              cols={40}
                              style={{"overflow": " auto"} as CSSProperties}
                              max-width={'70%'}
                              onKeyDown={() => this.autoGrow(this.textAreaElement)}
                              value={this.props.userInput}
                    />
                </div>
            </div>
        );


        return retVal
    }
}
