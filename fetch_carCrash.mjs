import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const db = new pg.Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

await db.connect();

async function getCrashList() {
    const url = "https://crashviewer.nhtsa.dot.gov/CrashAPI/crashes/GetCaseList?states=1,51&fromYear=2014&toYear=2015&minNumOfVehicles=1&maxNumOfVehicles=6&format=json";
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const responseData = await response.json();
        const crashData = responseData.Results[0]; //An array of JSON objects each is a crash
        
        function extractYearFromCrashDate(crashDate) {
            if (!crashDate) return null;
            
            const timestamp = crashDate.substring(
                crashDate.indexOf('(') + 1,
                crashDate.indexOf('-')
            );
            
            return new Date(parseInt(timestamp)).getFullYear();
        }
        
        const crashList = crashData.map(crash => ({
            StateNumber: crash.State,
            CaseNumber: crash.St_Case,
            CaseYear: extractYearFromCrashDate(crash.CrashDate)
        }));

        console.log(`[PASS] Successfully obtained crash list with ${crashList.length} crashes`);
        return crashList; // return an array of object with StateNumber, CaseNumber, CaseYear which is input of detail api
    } catch (error) {
        console.error("[FAIL] Error fetching crash data:", error);
        return [];
    }
}

async function getCrashDetails(crashList) {
    const detailsArray = [];
    const locationsArray = [];
    let processedCount = 0;
    const totalCrashes = crashList.length;
    
    for (const crash of crashList) {
        const url = `https://crashviewer.nhtsa.dot.gov/CrashAPI/crashes/GetCaseDetails?stateCase=${crash.CaseNumber}&caseYear=${crash.CaseYear}&state=${crash.StateNumber}&format=json`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const detailData = await response.json();
            
            try {
                const crashData = detailData.Results[0][0].CrashResultSet;
                locationsArray.push({
                    latitude: crashData.LATITUDE,
                    longitude: crashData.LONGITUD,
                    city: crashData.CITYNAME
                });
                detailsArray.push(detailData['Results'][0]);
            } catch (locationError) {
                console.error(`[FAIL] Error extracting location data for case ${crash.CaseNumber}:`, locationError);
            }
            
        } catch (error) {
            console.error(`[FAIL] Error fetching details for case ${crash.CaseNumber}:`, error);
        }
        
        processedCount++;
        if (processedCount % 100 === 0 || processedCount === totalCrashes) {
            console.log(`[PROGRESS] ${processedCount}/${totalCrashes} crashes processed (${Math.round(processedCount/totalCrashes*100)}%)`);
        }
    }
    
    console.log(`[PASS] Completed fetching ${detailsArray.length} crash details with ${locationsArray.length} location data points`);
    
    return {
        locations: locationsArray,
        details: detailsArray
    };
}

async function saveLocationData(crashData) {
    try {
        await db.query('BEGIN');

        for (let i = 0; i < crashData.locations.length; i++) {
            const location = crashData.locations[i];
            const crashDetail = crashData.details[i][0].CrashResultSet;
            
            const query = `
                INSERT INTO location (
                    lat,
                    lon,
                    state,
                    city,
                    route,
                    route_name
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (lat, lon) DO NOTHING
            `;

            const values = [
                parseFloat(location.latitude),
                parseFloat(location.longitude),
                crashDetail.STATENAME || null,
                location.city || null,
                parseInt(crashDetail.ROUTE) || null,
                crashDetail.TWAY_ID || crashDetail.ROUTE_NAME || null
            ];

            await db.query(query, values);
        }

        await db.query('COMMIT');
        console.log('[PASS] Successfully saved location data to database');
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('[FAIL] Error saving location data:', error);
        throw error;
    }
}

export async function processAllCrashData() {
    try {
        const crashes = await getCrashList();
        
        if (crashes.length === 0) {
            console.log("[FAIL] No crashes found. Exiting process.");
            return { locations: [], details: [] };
        }
        
        // Testing block - uncomment to process only first 10 crashes
        crashes.length = Math.min(crashes.length, 10);
        console.log(`[TEST] Processing limited to first ${crashes.length} crashes`);
        // End of testing block
        
        console.log(`[INFO] Processing all ${crashes.length} crashes...`);
        
        const result = await getCrashDetails(crashes);
        
        console.log("\nSummary Report");
        console.log("------------------");
        console.log(`[PASS] Total crashes processed: ${crashes.length}`);
        console.log(`[PASS] Details obtained: ${result.details.length}`);
        console.log(`[PASS] Locations mapped: ${result.locations.length}`);
        console.log(`[INFO] Both arrays have ${result.locations.length === result.details.length ? 'matching' : 'different'} sizes`);
        
        await saveLocationData(result);
        
        return result; // return an object with locations array and details array
    } catch (error) {
        console.error("[FAIL] Error in processing crash data:", error);
        return { locations: [], details: [] };
    }
}

// This is to make sure that the file only runs when we directly run it, but not when it is imported into fetch_weather.js
if (import.meta.url === `file://${process.argv[1]}`) {
    const crashDataResult = processAllCrashData();
}
