import * as firebase from 'firebase'
import firestore from 'firebase/firebase-firestore'

interface FirebaseConfig{
    apiKey: string,
    authDomain: string,
    databaseURL: string,
    projectId: string,
    storageBucket: string,
    messagingSenderId: string,


}
var config: FirebaseConfig  = {

    apiKey: "AIzaSyAKzcd6jibmJTJqZHIbAhPgjRv_m0f4cws",
    authDomain: "podcastplusv1.firebaseapp.com",
    databaseURL: "https://podcastplusv1.firebaseio.com",
    projectId: "podcastplusv1",
    storageBucket: "podcastplusv1.appspot.com",
    messagingSenderId: "898237232429",


};
firebase.initializeApp(config);
const firestore = firebase.firestore();

firestore.settings({timestampsInSnapshots: true})

export const db = firebase.firestore();

export function createCounter ( ref: firebase.firestore.DocumentReference, num_shards: number) {
    var batch = db.batch();
    // Initialize the counter document

    batch.set(ref, { num_shards: num_shards }, {merge: true});

    // Initialize each shard with count=0
    for (let i = 0; i < num_shards; i++) {
        let shardRef = ref.collection('shards').doc(i.toString());
        batch.set(shardRef, { count: 0 }, {merge: true} );
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
            t.update(shard_ref, { count: new_count });
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

