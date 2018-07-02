import * as styles from "./poll-user-choice.css";
import * as React from "react";
import {Component} from "react";
import {ChatBubbleImage, ChatBubbleLink, ChatBubbleProperties} from "../chat-bubble/chat-bubble";
import {Chapter} from "../../interfaces/script";
import {createCounter, db, getCount, incrementCounter} from "../../bridge/database";

interface ChatBubblePollProperties {
    question: string;
    choices: string[];
    followUp?: string;
    pollID: string;
    showResults: boolean;
    onResize: ()=> void;

}

interface ChatBubblePollState {
    pollSent: boolean;
    databaseRefs: any[];
    value: any;
}

export class PollUserChoice extends Component<ChatBubblePollProperties, ChatBubblePollState> {
    constructor(props) {
        super(props);
        this.state = {
            pollSent: false,
            databaseRefs: [], // Todo:fix any
            value: []
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


    render() {

        let retVal;
        if (!this.state.pollSent) {
            retVal = (
                <div key="poll-choice" className={styles.bubblePollButtonsContainer}>
                    <div>{this.props.question}</div>

                    <button className={styles.bubblePollButtons} onClick={() => {

                        incrementCounter(db, this.state.databaseRefs[0], 10);
                        let iterable = this.state.databaseRefs.map((val) => getCount(val));
                        let results = Promise.all(iterable)
                            .then((valutys) => {
                                this.setState({
                                    pollSent: true,
                                    value: valutys
                                })
                                this.props.onResize();
                            })
                        this.props.onResize();
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
                                    value: valutys
                                })
                            })
                        this.props.onResize();
                    }}>
                        {this.props.choices[1]}
                    </button>

                </div>

            )
        } else {

            let followUptext: React.CSSProperties = {
                color: "#0c327d",
                fontSize: "1.4em",
                marginBottom: "8px"
            };
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
