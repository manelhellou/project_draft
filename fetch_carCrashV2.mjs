import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {getVictim, getInjury} from './generator_function.js'
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

async function savePersonVehicle(victim_id,VIN, driving){
    const query = `
            INSERT INTO vehicle_victim (
                victim_id,
                VIN,
                driving
            ) VALUES ($1, $2, $3)
            RETURNING victim_id
        `;

    const values = [
        victim_id,
        VIN,
        driving
    ];

    await db.query(query, getVictim());
}

async function saveVehicleAccident(VIN,accident_id){
    const query = `
            INSERT INTO accident_vehicle (
                vehicle_id,
                VIN
            ) VALUES ($1, $2)
            
        `;

    const values = [
        accident_id,
        VIN
    ];

    await db.query(query, values);

}

async function savePersonData(VIN, passengernum){

    for (let i = 0; i < passengernum; i++) {
        const query = `
            INSERT INTO victim (
                first_name,
                last_name,
                date_of_birth,
                sex,
                health_insurance,
                contact_inf,
                ssn
            ) VALUES ($1, $2, $3, $4, $5,$6,$7)
            RETURNING victim_id
        `;

        const result = await db.query(query, getVictim());
        const driving = (i === 0);
        await savePersonVehicle(result.rows[0].victim_id,VIN, driving);

    }

}

async function saveVehicleData(crashData, accident_id){
    for (let j = 0; j < crashData.Vehicles.length; j++) {
        const vehicle = crashData.Vehicles[j];

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

        const modelYear = crashData.MOD_YEAR ? (parseInt(crashData.MOD_YEAR) || null) : null;

        const values = [
            vehicle.VIN,
            vehicle.MAKENAME,
            vehicle.MODELNAME,
            vehicle.BODYSTYL_T,
            modelYear
        ];

        await db.query(query, values);
        await saveVehicleAccident(vehicle.VIN, accident_id);
        if (vehicle.Persons.length>0)
            savePersonData(vehicle.VIN, vehicle.Persons.length);
    }
}

async function saveLocationData(crashData) {
    const query = `
        INSERT INTO location (lat,
                              lon,
                              state,
                              city,
                              route,
                              route_name,
                              county)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (lat, lon) DO NOTHING
    `;

    const values = [
        parseFloat(crashData.LATITUDE),
        parseFloat(crashData.LONGITUD),
        crashData.STATENAME || null,
        crashData.CITYNAME || null,
        parseInt(crashData.ROUTE) || null,
        crashData.ROUTE_NAME || crashData.TWAY_ID || null,
        crashData.COUNTYNAME || null
    ];

    await db.query(query, values);
}

async function saveAccidentData(crashData) {
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
                RETURNING accident_id
            `;

            const crashDate = new Date(
                parseInt(crashData.CaseYear),
                parseInt(crashData.MONTH) - 1,
                parseInt(crashData.DAY),
                parseInt(crashData.HOUR),
                parseInt(crashData.MINUTE)
            );

            const values = [
                null,
                parseInt(crashData.ST_CASE),
                crashDate,
                crashData.HARM_EVNAME || 'Unknown',
                parseFloat(location.latitude),
                parseFloat(location.longitude)
            ];

            saveLocationData(crashData);

            const result = await db.query(query, values);
            saveVehicleData(crashData, result.rows[0].accident_id);

}

async function getCrashDetails(crashList) {

    for (const crash of crashList) {
        const url = `https://crashviewer.nhtsa.dot.gov/CrashAPI/crashes/GetCaseDetails?stateCase=${crash.CaseNumber}&caseYear=${crash.CaseYear}&state=${crash.StateNumber}&format=json`;

        await db.query('BEGIN');
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const detailData = await response.json();
            const crashData= detailData.Results[0][0].CrashResultSet;



            saveAccidentData(crashData);

            await db.query('COMMIT');
        } catch (error) {
            await db.query('ROLLBACK');
            console.error('[FAIL] Error saving accident data:', error);
            throw error;
        }
    }
}