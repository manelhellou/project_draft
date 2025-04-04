import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const db = new pg.Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(path.join(process.cwd(), 'us-east-2-bundle.pem')).toString()
    }
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
    const BATCH_SIZE = 10;
    
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
        
        if (processedCount % BATCH_SIZE === 0 || processedCount === totalCrashes) {
            const batchStart = Math.max(0, processedCount - BATCH_SIZE);
            const batchEnd = processedCount;
            
            const batchData = {
                locations: locationsArray.slice(batchStart, batchEnd),
                details: detailsArray.slice(batchStart, batchEnd)
            };
            
            await saveLocationData(batchData);
            await saveAccidentData(batchData);
            // await saveVehicleData(batchData);
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
                    route_name,
                    county
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (lat, lon) DO NOTHING
            `;

            const values = [
                parseFloat(location.latitude),
                parseFloat(location.longitude),
                crashDetail.STATENAME || null,
                location.city || null,
                parseInt(crashDetail.ROUTE) || null,
                crashDetail.ROUTE_NAME || crashDetail.TWAY_ID || null,
                crashDetail.COUNTYNAME || null
            ];

            await db.query(query, values);
        }

        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('[FAIL] Error saving location data:', error);
        throw error;
    }
}

async function saveAccidentData(crashData) {
    try {
        await db.query('BEGIN');

        for (let i = 0; i < crashData.details.length; i++) {
            const crashDetail = crashData.details[i][0].CrashResultSet;
            const location = crashData.locations[i];
            
            const query = `
                INSERT INTO accident (
                    accident_id,  
                    weather_id,
                    state_case,
                    time,
                    evenement_name,
                    lat,
                    lon
                ) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6)
            `;

            const crashDate = new Date(
                parseInt(crashDetail.CaseYear),
                parseInt(crashDetail.MONTH) - 1, 
                parseInt(crashDetail.DAY),
                parseInt(crashDetail.HOUR),
                parseInt(crashDetail.MINUTE)
            );

            const values = [
                null, 
                parseInt(crashDetail.ST_CASE),
                crashDate,
                crashDetail.HARM_EVNAME || 'Unknown', 
                parseFloat(location.latitude),
                parseFloat(location.longitude)
            ];

            await db.query(query, values);
        }

        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('[FAIL] Error saving accident data:', error);
        throw error;
    }
}

async function saveVehicleData(crashData) {
    try {
        await db.query('BEGIN');

        for (let i = 0; i < crashData.details.length; i++) {
            const crashDetail = crashData.details[i][0].CrashResultSet;
            
            const query = `
                INSERT INTO vehicle (
                    vin,
                    maker,
                    model,
                    type,
                    model_year
                ) VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (vin) DO NOTHING
            `;

            const modelYear = crashDetail.MOD_YEAR ? (parseInt(crashDetail.MOD_YEAR) || null) : null;

            const values = [
                crashDetail.VIN,
                crashDetail.MAKENAME,
                crashDetail.MODELNAME,
                crashDetail.BODYSTYL_T,
                modelYear
            ];

            await db.query(query, values);
        }

        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('[FAIL] Error saving vehicle data:', error);
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
        // crashes.length = Math.min(crashes.length, 10);
        // console.log(`[TEST] Processing limited to first ${crashes.length} crashes`);
        // End of testing block
        
        console.log(`[INFO] Processing all ${crashes.length} crashes...`);
        
        const result = await getCrashDetails(crashes);
        
        console.log("\nSummary Report");
        console.log("------------------");
        console.log(`[PASS] Total crashes processed: ${crashes.length}`);
        console.log(`[PASS] Details obtained: ${result.details.length}`);
        console.log(`[PASS] Locations mapped: ${result.locations.length}`);
        console.log(`[PASS] Both arrays have ${result.locations.length === result.details.length ? 'matching' : 'different'} sizes`);
        
        await db.end();
        console.log('[PASS] Database connection closed');
        
        return result;// return an object with locations array and details array
    } catch (error) {
        console.error("[FAIL] Error in processing crash data:", error);
        await db.end();
        console.log('[INFO] Database connection closed after error');
        return { locations: [], details: [] };
    }
}

// This is to make sure that the file only runs when we directly run it, but not when it is imported into fetch_weather.js
if (import.meta.url === `file://${process.argv[1]}`) {
    const crashDataResult = processAllCrashData();
}
