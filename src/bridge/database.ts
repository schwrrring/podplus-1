import * as firebase from 'firebase'
import firestore from 'firebase/firebase-firestore'

interface FirebaseConfig {
    apiKey: string | undefined,
    authDomain: string | undefined,
    databaseURL: string | undefined,
    projectId: string | undefined,
    storageBucket: string | undefined,
    messagingSenderId: string | undefined
}

var config: FirebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    databaseURL: FIREBASE_DATABASE_URL,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
};

firebase.initializeApp(config);

export const db = firebase.firestore();
// needed to be configured due to deprecation warning in browser
db.settings({timestampsInSnapshots: true})

/**
 * the following methods are used in poll-user-choice-component to save and get to save and return user voting results as used in the
 * ------------------------------------------------------------------------------------------------------------------------------
 */

/**
 * creates a distributed counter for firestore in order to count multiple user votes
 * at the same time. See https://firebase.google.com/docs/firestore/solutions/counters
 *
 * @param {firebase.firestore.DocumentReference} ref
 * @param {number} num_shards
 * @returns {Promise<void>}
 */
export function createCounter(ref: firebase.firestore.DocumentReference, num_shards: number) {
    var batch = db.batch();
    // Initialize the counter document
    batch.set(ref, {num_shards: num_shards}, {merge: true});
    // Initialize each shard with count=0
    for (let i = 0; i < num_shards; i++) {
        let shardRef = ref.collection('shards').doc(i.toString());
        batch.set(shardRef, {count: 0}, {merge: true});
    }
    // Commit the write batch
    return batch.commit();
}

export function incrementCounter(db, ref, num_shards) {
    // Select a shard of the counter at random
    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection('shards').doc(shard_id);

    // Update count in a transaction
    return db.runTransaction(t => {
        return t.get(shard_ref).then(doc => {
            const new_count = doc.data().count + 1;
            t.update(shard_ref, {count: new_count});
        });
    });
}

var getOptions = {
    source: 'server'
};

export function getCount(ref) {
    // Sum the count of each shard in the subcollection
    return ref.collection('shards').get(getOptions).then(snapshot => {
        let total_count = 0;
        snapshot.forEach(doc => {
            total_count += doc.data().count;
        });

        return total_count;
    });
}

//-------------------------------------------------------------------------

/**
 * used in poll-user-text-input component to save text messages sent by users
 *
 * @param {String} pollId
 * @param projectId
 * @param db
 * @param message
 */
export function saveTextInput(pollId: String, projectId, db, message) {
    let docRef = db.collection(projectId).doc(pollId);
    docRef.get().then(
        (value) => {
            if (!value.exists) {
                docRef.set({values: [message]});
            }
            else {
                try {
                    docRef.update(
                        {values: firebase.firestore.FieldValue!.arrayUnion(message)}
                    )
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
    ).then(() => console.log('Successfully written'))
        .catch(err => console.log(err));
}
