import {ChatBubbleProperties, ChatBubble} from "../ui/chat-bubble/chat-bubble";
import {BubbleGroup} from "../ui/bubble-group/bubble-group";
import {ShowNotification, RunCommand} from "worker-commands";
import * as React from "react";
import {ChatBubbleWrapper} from "../ui/chat-bubble-wrapper/chat-bubble-wrapper";
import FrameContext from "../contexts/frame-context";
import ScrollViewItemContext from "../ui/performance-scroll-view/scroll-view-item-context";
import {string} from "prop-types";

export interface Chapter {
    time: number;
    name: string;
}

export interface ScriptMetadata {
    title: string;
    description: string;
    avatarFile: string;
    length: number;
    episodeName: string;
    artwork: string;
    // used in side-menu contact section
    contactHeader: string;
    // link to external survey-page
    surveyUrl: string;
    // header Used in PushNotifications
    pushNotificationHeader: string;
}

export interface ScriptContact {
    tel?: string;
    sms?: string;
    email?: string;
    // used in side-menu contact section
    headerContactPopUp?: string;
    teaserContactPopUp?: string;
}

export interface ScriptTeamMember {
    name: string;
    role: string;
    credit: string;
    photo: string;
}

export interface Script {
    items: ChatBubbleProperties[];
    chapters: Chapter[];
    audioFile: string;
    baseURL: string;
    metadata: ScriptMetadata;
    podcastId: string;
    episodeId: string;
    assets: string[];
    dingFile: string;
    contact: ScriptContact;
    team: ScriptTeamMember[];
}

export function makeRelative(url: string, baseURL: string) {
    return new URL(url, baseURL).href;
}

function mapScriptEntry(
    response: ChatBubbleProperties,
    index: number,
    baseURL: URL,
    pushNotificationHeader: string
): JSX.Element | undefined {
    // Hack for last-minute iOS bug
    if (
        (!("Notification" in window) || !("serviceWorker" in navigator)) &&
        response.link &&
        response.link.specialAction === "open-side-menu"
    ) {
        return undefined;
    }

    let mappedProperties: ChatBubbleProperties = {
        time: response.time
    };
    // let baseURL = new URL(this.props.url, window.location.href);

    mappedProperties.text = response.text as string;

    let elements: JSX.Element[] = [
        <ChatBubble {...mappedProperties} key={`item_${index}_main`}/>
    ];

    let notificationOptions: ShowNotification = {
        title: pushNotificationHeader,
        body: response.text || response.notificationOnlyText || "",
        events: {
            onclick: [
                {
                    command: "notification.close"
                },
                {
                    command: "podmod.closephoto"
                },
                {
                    command: "clients.focus"
                }
            ]
        }
    };

    if (response.images && response.images.length > 0) {
        let images = response.images.map(image => {
            let caption = response.text;

            if (!response.text && response.link) {
                caption = `<a target="_blank" href="${response.link.url}">${response.link.title}</a>`;
            }

            return Object.assign({}, image, {
                url: makeRelative(image.url, baseURL.href),
                caption: caption
            });
        });

        notificationOptions.image = images[0].url;

        (notificationOptions.events!.onclick as RunCommand<any>[]).push({
            command: "podmod.openphoto",
            options: {
                url: images[0].url
            }
        });

        elements.unshift(<ChatBubble time={response.time} key={`item_${index}_images`} images={images}/>);
    }

    if (response.openQuestion) { // TODO: zwischen Poll 1 und Poll 2 unterscheiden

        let secondItemProperties: ChatBubbleProperties = {
            time: response.time,
            openQuestion: response.openQuestion,
        };

        elements.push(
            <ScrollViewItemContext.Consumer key={'scrollViewItemContext'}>{
                viewItemContext =>
                    <FrameContext.Consumer key = {'frameContext'}>{
                        value =>
                            <ChatBubbleWrapper onResize={viewItemContext.onResize}
                                               cacheName={value.cacheName!} {...secondItemProperties}
                                               key={`item_${index}_openQuestion`}/>
                    }
                    </FrameContext.Consumer>}
            </ScrollViewItemContext.Consumer>
        );

    }

    if (response.multipleChoice) {

        let secondItemProperties: ChatBubbleProperties = {
            time: response.time,
            multipleChoice: response.multipleChoice,
        };

        elements.push(<ChatBubble {...secondItemProperties} key={`item_${index}_multipleChoice`}/>);

    }

    if (response.dataWrapper){
        let secondItemProperties: ChatBubbleProperties = {
            time: response.time,
            dataWrapper: true,
        };
        elements.push(<ChatBubble {...secondItemProperties} key={`item_${index}_multipleChoice`}/>);
    }

    if (response.link) {
        let url = new URL(response.link.url, baseURL.href);
        let imageURL: string | undefined = undefined;

        if (response.link.image) {
            imageURL = new URL(response.link.image, baseURL.href).href;
        }

        let secondItemProperties: ChatBubbleProperties = {
            time: response.time as number,
            link: {
                url: url.href as string,
                domain: url.hostname as string,
                image: imageURL as string,
                title: response.link.title as string,
                specialAction: response.link.specialAction as string
            }
        };

        elements.push(<ChatBubble {...secondItemProperties} key={`item_${index}_link`}/>);
    }

    if (response.link) {
        notificationOptions.body = response.link.title;
        notificationOptions.actions = [
            {
                action: "openlink",
                title: "Open link"
            }
        ];

        notificationOptions.events!.onopenlink = [
            {
                command: "notification.close"
            },
            {
                command: "clients.open",
                options: {
                    url: response.link.url
                }
            }
        ];
    }

    return (
        <BubbleGroup
            notification={notificationOptions}
            key={"item_" + index}
            silent={response.silent || false}
        >
            {elements}
        </BubbleGroup>
    );
}

export function mapScriptEntries(script: Script, baseURL: URL) {

    let items: JSX.Element[] = [];
    let currentChapterIndex = 0;

    script.items.forEach((scriptItem, idx) => {
        let currentChapter = script.chapters[currentChapterIndex];
        if (currentChapter && currentChapter.time <= scriptItem.time) {
            items.push(
                <BubbleGroup key={"chapter_" + currentChapterIndex} silent={true}>
                    <ChatBubble chapterIndicator={currentChapter} time={currentChapter.time}/>
                </BubbleGroup>
            );
            currentChapterIndex++;
        }

        let item = mapScriptEntry(scriptItem, idx, baseURL, script.metadata.pushNotificationHeader);
        if (item) {
            items.push(item);
        }
    });
    return items;
}
