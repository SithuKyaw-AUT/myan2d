import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// Type definition for the API result
type ApiResult = {
    set: string;
    value: string;
    twoD: string;
};

type ApiDailyResult = {
    date: string;
    s11_00?: ApiResult | null;
    s12_01?: ApiResult | null;
    s15_00?: ApiResult | null;
    s16_30?: ApiResult | null;
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

    const data: ApiDailyResult[] = await response.json();
    console.log(`Successfully fetched ${data.length} records from the API.`);

    if (data.length === 0) {
        console.log('No data to import. Exiting.');
        return;
    }

    // --- Process only the latest day's results from the API ---
    const latestRecord = data[0];

    // 3. Prepare and write data to Firestore
    const batch = db.batch();
    const collectionRef = db.collection('lottery_results');
    
    const docId = latestRecord.date;
    if (!docId) {
        console.error('Error: Latest record from API has no date. Exiting.');
        return;
    }

    const docRef = collectionRef.doc(docId);
    
    const dataToSet: Partial<ApiDailyResult> & { date: string } = {
        date: latestRecord.date,
        s11_00: latestRecord.s11_00 || null,
        s12_01: latestRecord.s12_01 || null,
        s16_30: latestRecord.s16_30 || null,
    };
    
    // Business logic: The 3:00 PM result is always a copy of the 12:01 PM result.
    // We enforce this here to correct any potential upstream API errors.
    if (latestRecord.s12_01) {
        console.log(`Ensuring 15:00 result is a copy of 12:01 result (${latestRecord.s12_01.twoD}).`);
        dataToSet.s15_00 = latestRecord.s12_01;
    } else {
        dataToSet.s15_00 = latestRecord.s15_00 || null;
    }

    // Using set with { merge: true } makes this an "upsert" operation.
    // If the document for today exists, it will be updated with the latest session data.
    // If you delete the document, it will be recreated on the next run.
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
