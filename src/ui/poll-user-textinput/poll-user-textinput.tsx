import * as styles from "./poll-user-textinput.css";
import * as React from "react";
import {ChangeEvent, Component} from "react";
import {ChatBubblePollProperties, ChatBubblePollState} from "../chat-bubble/chat-bubble";
import {db, saveTextInput} from "../../bridge/database";
import {FrameFunctions} from "../frame/frame";



export interface PollUserTextinputProperties {
    question: string;
    followUp?: string;
    pollID: string;
    onResize?: ()=> void;
    projectId?: string;
    frameFunctions?: FrameFunctions;
    activateAnswerBubble?: (string)=>void;
}

export interface PollUserTextinputState {
    pollSent: boolean;
    value: any;
    showInputButtons: boolean;
}


export class PollUserTextinput extends Component<PollUserTextinputProperties, PollUserTextinputState> {
    textAreaElement: HTMLTextAreaElement | null;

    constructor(props) {
        super(props);
        this.state = {
            pollSent: false,
            value: '',
            showInputButtons: false,
        }
        this.onTextAreaChange = this.onTextAreaChange.bind(this);
        this.autoGrow = this.autoGrow.bind(this)
    }


    componentDidMount() {
        // dirty dirty hack to make the textArea available
        document.getElementById(this.props.pollID)!.parentElement!.parentElement!.parentElement!.parentElement!.style.zIndex = "1";

    }



    onTextAreaChange(event) {
        let value = event.target.value;
        this.setState({value: event.target.value});
        if (value.length != 0  ) {
            this.props.onResize!();
        }
    }

    autoGrow(element) {
        element.style.height = "auto";
        element.style.height = (element.scrollHeight) + "px";
        this.props.onResize!();
    }

    render() {
        let retVal;
        if (!this.state.pollSent) {
            retVal = (
                <div className={styles.pollUserChoicePadding} id={this.props.pollID}>
                    <div className={styles.bubblePollButtonsContainer}>
                    <textarea ref={el => (this.textAreaElement = el)}
                              onChange={this.onTextAreaChange}
                              className={styles.userInputArea}
                              placeholder={"Nachricht schreiben..."}
                              autoFocus={false}
                              onKeyDown={() => this.autoGrow(this.textAreaElement)}
                              value={this.state.value}
                    />

                        <div>
                            <button onClick={() => {
                                this.setState({pollSent: false})
                            }}>
                                Abbrechen
                            </button>
                            <button onClick={() => {
                                this.setState({pollSent: true})
                                saveTextInput(this.props.pollID, this.props.projectId, db, this.state.value)
                                this.props.activateAnswerBubble!(this.state.value);
                                // this.props.onResize!();
                            }}>
                                Senden
                            </button>
                        </div>

                    </div>

                </div>);

        } else {
            retVal = (
                <div key="text" className={styles.pollUserChoicePadding}>
                    {this.props.followUp}
                </div>
            )
        }
        return retVal
    }
}
