import * as styles from "./poll-user-choice.css";
import * as React from "react";
import {Component} from "react";
import {ChatBubbleImage, ChatBubbleLink, ChatBubbleProperties} from "../chat-bubble/chat-bubble";
import {Chapter} from "../../interfaces/script";
import {createCounter, db, getCount, incrementCounter} from "../../bridge/database";
import {FrameFunctions} from "../frame/frame";
import MDSpinner from "react-md-spinner";

interface ChatBubblePollProperties {
    question: string;
    choices: string[];
    followUp?: string;
    pollID: string;
    showResults: boolean;
    onResize: () => void;
    frameFunctions?: FrameFunctions;
    projectId?: string;
    changeBubbleClass?: (string) => void;
    parentClassChanged: boolean | undefined;

}

interface ChatBubblePollState {
    pollSent: boolean;
    isLoading: boolean;
    databaseRefs: any[];
    value: any;

}

export class PollUserChoice extends Component<ChatBubblePollProperties, ChatBubblePollState> {
    constructor(props) {
        super(props);
        this.state = {
            pollSent: false,
            databaseRefs: [], // Todo:fix any
            value: [],
            isLoading: false
        }
        this.setUpDatabase = this.setUpDatabase.bind(this);
    }

    setUpDatabase() {
        let temp: any[];
        temp = [];
        for (var i = 0; i < this.props.choices.length; i++) {
            let ref = db.collection(this.props.pollID).doc(this.props.choices[i]);
            const ergebnis = ref.get()
            ergebnis.then(function (value) {
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
        this.setUpDatabase()
    }

    checkIfHidden = () => {
        return this.state.isLoading ? styles.hiddenChatBubble : styles.bubblePollButtonsContainer
    }


    render() {

        let retVal;
        if (!this.state.pollSent) {
            retVal = (
                <div className={styles.isLoadingSpinnerContainer}>
                    <div key="poll-choice" className={this.checkIfHidden()}>
                        <div>{this.props.question}</div>
                        <button className={styles.bubblePollButtons} onClick={() => {
                            incrementCounter(db, this.state.databaseRefs[0], 10);
                            let iterable = this.state.databaseRefs.map((val) => getCount(val));
                            let results = Promise.all(iterable)
                                .then((valutys) => {
                                    this.setState({
                                        pollSent: true,
                                        value: valutys,
                                        isLoading: false
                                    })
                                    this.props.changeBubbleClass!('bubble-right')
                                    this.props.onResize();
                                })
                                .catch(() => console.log('couldnt get answer data'))
                            this.setState({isLoading: true})
                            // this.props.onResize();
                        }}>
                            {this.props.choices[0]}
                        </button>
                        <button className={styles.bubblePollButtons} onClick={() => {

                            incrementCounter(db, this.state.databaseRefs[1], 10);
                            let iterable = this.state.databaseRefs.map((val) => getCount(val));
                            let results = Promise.all(iterable)
                                .then((valutys) => {
                                    this.setState({
                                        pollSent: true,
                                        value: valutys,
                                        isLoading: false
                                    })
                                    this.props.changeBubbleClass!('bubble-right')
                                    this.props.onResize();
                                })

                        }}>
                            {this.props.choices[1]}
                        </button>
                    </div>
                    {this.state.isLoading &&
                    <div className={styles.isLoadingSpinner}>
                        <MDSpinner singleColor={'#214683'}/>
                    </div>
                    }
                </div>

            )
        } else {
            retVal = (
                <div key="text" className={styles.bubbleTextPadding}>
                    <div className={styles.bubbleText}>
                        <div>{this.props.followUp}</div>
                        {this.props.showResults == true &&
                        <div>
                            <div>
                                {this.props.choices[0]}: {calculatePercentage(this.state.value[0], this.state.value[1])} %
                            </div>
                            <div>
                                {this.props.choices[1]}: {calculatePercentage(this.state.value[1], this.state.value[0])} %
                            </div>
                        </div>
                        }

                    </div>
                </div>
            )
        }
        return retVal
    }
}


function calculatePercentage(a: number, b: number) {
    let aInpercent: number;

    aInpercent = Math.floor((a / (a + b) * 100));

    return aInpercent
}
