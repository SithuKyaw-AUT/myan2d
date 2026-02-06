import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// Type definitions to match the new API structure
type ApiChildResult = {
    time: string;
    set: string;
    value: string;
    twod: string; // The API uses 'twod'
};

type ApiDailyRecord = {
    date: string;
    child: ApiChildResult[];
};

// Internal Firestore structure type for clarity
type FirestoreResult = {
    set: string;
    value: string;
    twoD: string; // Firestore and the app use 'twoD'
};

// Main function to run the import
async function importData() {
    console.log('Starting data import process to update latest results...');

    // 1. Initialize Firebase Admin SDK
    const serviceAccountKeyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKeyJson) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for authentication.');
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKeyJson);

    // Initialize app if not already initialized
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
    
    const db = admin.firestore();
    console.log('Firebase Admin SDK initialized successfully.');

    // 2. Fetch data from the API
    const apiUrl = 'https://api.thaistock2d.com/2d_result';
    console.log(`Fetching data from ${apiUrl}...`);
    const response = await fetch(apiUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch data from API. Status: ${response.status} ${response.statusText}`);
    }

    const data: ApiDailyRecord[] = await response.json();
    console.log(`Successfully fetched ${data.length} records from the API.`);

    if (data.length === 0) {
        console.log('No data to import. Exiting.');
        return;
    }

    // --- Process only the latest day's results from the API ---
    const latestApiRecord = data[0];

    // 3. Prepare and write data to Firestore
    const batch = db.batch();
    const collectionRef = db.collection('lottery_results');
    
    const docId = latestApiRecord.date;
    if (!docId) {
        console.error('Error: Latest record from API has no date. Exiting.');
        return;
    }

    const docRef = collectionRef.doc(docId);
    
    // Map the child results to a more accessible structure
    const resultsByTime: { [key: string]: FirestoreResult } = {};
    for (const childResult of latestApiRecord.child) {
        // Ensure the child record is valid before processing
        if (childResult.time && childResult.twod) {
            const firestoreResult: FirestoreResult = {
                set: childResult.set,
                value: childResult.value,
                twoD: childResult.twod, // Map 'twod' from API to 'twoD' for Firestore
            };
            resultsByTime[childResult.time] = firestoreResult;
        }
    }
    
    const s12_01_result = resultsByTime['12:01:00'] || null;

    const dataToSet = {
        date: latestApiRecord.date,
        s11_00: resultsByTime['11:00:00'] || null,
        s12_01: s12_01_result,
        s16_30: resultsByTime['16:30:00'] || null,
        // Business logic: The 3:00 PM result is always a copy of the 12:01 PM result.
        // We enforce this here to correct any potential upstream API errors.
        s15_00: s12_01_result, 
    };
    
    // Using set with { merge: true } makes this an "upsert" operation.
    // If the document for today exists, it will be updated with the latest session data.
    batch.set(docRef, dataToSet, { merge: true });
    
    // 4. Commit the batch
    console.log(`Preparing to write/update document for date ${docId} to Firestore...`);
    await batch.commit();
    console.log('Batch write to Firestore completed successfully!');
    console.log('Data import process finished.');
}

// Run the import function and handle errors
importData().catch(error => {
    console.error('An error occurred during the import process:', error);
    process.exit(1);
});
