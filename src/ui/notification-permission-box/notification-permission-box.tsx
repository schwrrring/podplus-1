import * as React from "react";
import * as contactBoxStyles from "../contact-box/contact-box.css";
import * as styles from "./notification-permission-box.css";

interface PermissionBoxProps {
    onClose: () => void;
}

export function NotificationPermissionBox(props: PermissionBoxProps) {
    return (
        <div
            style={{ pointerEvents: "auto", position: "absolute", width: "100%", height: "100%", zIndex: 11 }}
        >
            <div
                className={contactBoxStyles.contactBoxBack}
                onClick={e => {
                    props.onClose();
                    e.stopPropagation();
                }}
            />
            <div className={contactBoxStyles.contactBox}>
                <h3>Zum Aktivieren von Push-Nachrichten...</h3>
                <p>ändere bitte Deine Browser-Einstellungen.</p>
                <div className={styles.buttonBox}>
                    <button onClick={props.onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
