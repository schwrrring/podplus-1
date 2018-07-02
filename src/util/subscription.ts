import { runServiceWorkerCommand } from "service-worker-command-bridge";
import { UnsubscribeOptions, SubscribeOptions, sendMessage } from "pushkin-client";
export const PushSupported = "PushManager" in self;

export async function checkIfSubscribed(topicName: string) {
    let topics = await runServiceWorkerCommand<void, string[]>("get-subscribed-topics");
    return topics.indexOf(topicName) > -1;
}

export async function subscribe(topicName: string) {
    await runServiceWorkerCommand<SubscribeOptions, any>("push-subscribe", {
        topic: topicName,
        confirmationPayload: {
            __workerCommandPayload: {
                command: "notification.show",
                options: {
                    title: "You are subscribed",
                    body: "We'll send you a notification like this when a new episode is published.",
                    events: {
                        onclick: [
                            {
                                command: "client.focus"
                            },
                            {
                                command: "notification.close"
                            }
                        ]
                    }
                }
            }
        },
        confirmationIOS: {
            title: "__",
            body: "__"
        }
    });
}

export async function message(topicName: string, message: string) {
    console.log('this is called bingo');
    await runServiceWorkerCommand<SubscribeOptions, any>("send-message", {
        topic: topicName,
        confirmationPayload: {
            __workerCommandPayload: {
                command: "notification.show",
                options: {
                    title: "You are subscribed",
                    body: message,
                    events: {
                        onclick: [
                            {
                                command: "client.focus"
                            },
                            {
                                command: "notification.close"
                            }
                        ]
                    }
                }
            }
        },
        confirmationIOS: {
            title: "__",
            body: "__"
        }
    });
}

// This is how a message can be send: *malte
// message('mona_podcast', 'Es ist so fucking einfach!!! Und das ist geil!')

export async function unsubscribe(topicName: string) {
    await runServiceWorkerCommand<UnsubscribeOptions, any>("push-unsubscribe", {
        topic: topicName
    });
}
