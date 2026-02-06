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
    console.log('Starting data import process...');

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

    // 3. Prepare and write data to Firestore using a batch
    const batch = db.batch();
    const collectionRef = db.collection('lottery_results');
    let recordsToProcess = 0;

    for (const record of data) {
        // Use the date string as the document ID for idempotency
        const docId = record.date;
        if (!docId) continue;

        const docRef = collectionRef.doc(docId);
        
        // Transform the data to match the Firestore structure if needed.
        // In this case, it's already a good match.
        const dataToSet = {
            date: record.date,
            s11_00: record.s11_00 || null,
            s12_01: record.s12_01 || null,
            s15_00: record.s15_00 || null,
            s16_30: record.s16_30 || null,
        };

        batch.set(docRef, dataToSet, { merge: true });
        recordsToProcess++;
    }
    
    if (recordsToProcess === 0) {
        console.log('No valid records to process. Exiting.');
        return;
    }
    
    // 4. Commit the batch
    console.log(`Preparing to write ${recordsToProcess} documents to Firestore...`);
    await batch.commit();
    console.log('Batch write to Firestore completed successfully!');
    console.log('Data import process finished.');
}

// Run the import function and handle errors
importData().catch(error => {
    console.error('An error occurred during the import process:', error);
    process.exit(1);
});
