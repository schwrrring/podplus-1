import * as styles from "./poll-user-textinput.css";
import * as React from "react";
import {ChangeEvent, Component} from "react";
import {ChatBubblePollProperties, ChatBubblePollState} from "../chat-bubble/chat-bubble";
import {createCounter, db, getCount, incrementCounter} from "../../bridge/database";


export class PollUserTextinput extends Component<ChatBubblePollProperties, ChatBubblePollState> {
    textAreaElement: HTMLTextAreaElement | null;

    constructor(props) {
        super(props);
        this.state = {
            pollSent: false,
            databaseRefs: [],
            value: [],
            showInputButtons: false
        }
        this.setUpDatabase = this.setUpDatabase.bind(this);
        this.showInputSendButtons = this.showInputSendButtons.bind(this);
        this.autoGrow = this.autoGrow.bind(this)
    }

    setUpDatabase() {
        let temp: any[];
        temp = [];
        for (var i = 0; i < this.props.choices.length; i++) {
            let ref = db.collection(this.props.pollID).doc(this.props.choices[i]);
            const ergebnis = ref.get()
            ergebnis.then(function (value) {
                console.log(value, "existiert Ckers?");
                if (!value.exists) {
                    createCounter(ref, 10)
                }
            })
            temp.push(ref)
        }
        this.setState(
            {databaseRefs: temp}
        )

    }

    componentDidMount() {

        // dirty dirty hack to make the textArea available
        document.getElementById(this.props.pollID)!.parentElement!.parentElement!.parentElement!.style.zIndex = "1";

        this.setUpDatabase()
    }

    showInputSendButtons(event){
        let value = event.target.value;
        if(value.length!=0){
            this.setState({showInputButtons: true})
            this.props.onResize!();
        } else{
            this.setState({showInputButtons: false})
        }


    }

    autoGrow(element) {
        element.style.height = "auto";
        element.style.height = (element.scrollHeight)+"px";
        this.props.onResize!();
    }

    render() {
        let self = this;

        let retVal;
        if (!this.state.pollSent) {
            ;
            retVal = (
                <div className={styles.userChoiceContainer} id={this.props.pollID}>
                    <div>{this.props.question}</div>
                    <div className={styles.bubblePollButtonsContainer}>

                    <textarea ref={el => (this.textAreaElement = el)}
                              onChange={this.showInputSendButtons}
                              className={styles.userInputArea}
                              placeholder={"Nachricht schreiben..."}
                              autoFocus={false}
                              onKeyDown={()=>this.autoGrow(this.textAreaElement)}
                    />
                        {this.state.showInputButtons &&
                        <div>
                            <button onClick={() => {
                                this.setState({pollSent: true})
                            }}>
                                Abbrechen
                            </button>
                            <button onClick={() => {
                                this.setState({pollSent: true})
                            }}>
                                Senden
                            </button>
                        </div>
                        }
                    </div>

                </div>)
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
