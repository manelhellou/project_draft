import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {getVictim, getInjury, getRespondent} from './generator_function.mjs'
dotenv.config();
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));

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
    const url = "https://crashviewer.nhtsa.dot.gov/CrashAPI/crashes/GetCaseList?states=1&fromYear=2010&toYear=2010&minNumOfVehicles=1&maxNumOfVehicles=6&format=json";

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
        `;

    const values = [
        victim_id,
        VIN,
        driving
    ];

    await db.query(query, values);
}

async function saveVehicleAccident(VIN,accident_id){
    const query = `
            INSERT INTO accident_vehicle (
                accident_id,
                VIN
            ) VALUES ($1, $2)
            
        `;

    const values = [
        accident_id,
        VIN
    ];

    await db.query(query, values);

}

async function saveRespondentData(county) {

           const query = `
    INSERT INTO emergency_respondent (
        first_name,
        last_name,
        date_of_birth,
        sex,
        contact_info,
        ssn,
        type,
        counties
    ) VALUES ($1, $2, $3, $4, $5,$6,$7,$8)
    RETURNING respondent_id
        `;


    const result = await db.query(query, getRespondent(county));
    return (result.rows[0].respondent_id);
}

async function saveIntervention(victim_id, accident_id, respondent_id) {
    const query = `
            INSERT INTO intervention (
                victim_id,
                accident_id,
                respondent_id,
                arrival_time,
                 intervention_details
            ) VALUES ($1, $2, $3,$4,$5)
            RETURNING victim_id
        `;
    const values = [
            victim_id,
            accident_id,
            respondent_id,
            null,
        null
        ];
    const result = await db.query(query, values);


}

async function savePersonAccident(victim_id, accident_id) {
    const query = `
            INSERT INTO accident_victim (
                victim_id,
                accident_id,
                injured,
                injury_desc
            ) VALUES ($1, $2, $3, $4)
        `;
    let values;
    if (Math.random()>0.8){
         values = [
            victim_id,
            accident_id,
            false,
            null
        ];
    } else {
        values = [
        victim_id,
        accident_id,
        true,
        getInjury()
    ];}
    const result = await db.query(query, values);

}

async function savePersonData(){
        const query = `
            INSERT INTO victim (
                first_name,
                last_name,
                date_of_birth,
                sex,
                health_insurance,
                contact_info,
                ssn
            ) VALUES ($1, $2, $3, $4, $5,$6,$7)
            RETURNING victim_id
        `;

        const result = await db.query(query, getVictim());
        return result.rows[0].victim_id;
}


async function saveVehicleData(crashData, accident_id){
    let vehicles = [];
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
        vehicles.push([vehicle.VIN, vehicle.Persons.length]);

    }
    return vehicles;
}

async function saveLocationData(crashData) {
    const query = `
        INSERT INTO location (lat,
                              lon,
                              state,
                              city,
                              route,
                              route_name,
                              county,
                              county_num)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (lat, lon) DO NOTHING
    `;

    const values = [
        parseFloat(crashData.LATITUDE),
        parseFloat(crashData.LONGITUDE),
        crashData.STATENAME || null,
        crashData.CITYNAME || null,
        parseInt(crashData.ROUTE) || null,
        crashData.ROUTE_NAME || crashData.TWAY_ID || null,
        crashData.COUNTYNAME || null,
        crashData.COUNTY || null
    ];

    await db.query(query, values);
}
async function saveDetailData(crashData, accident_id) {
    const query = `
                INSERT INTO details (
                    detail_id,  
                    detail_information,
                    light_condition,
                    road_function,
                    intersection_type,
                    drunk_driving
                ) VALUES ( $1, $2, $3, $4, $5, $6)
                
            `;
    const values = [
        accident_id,
        crashData.HARM_EVNAME,
        crashData.LGT_CONDNAME,
        crashData.ROAD_FNCNAME,
        crashData.TYP_INTNAME,
        (crashData.DRUNK_DR>0)];
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
                parseFloat(crashData.LATITUDE),
                parseFloat(crashData.LONGITUDE)
            ];


            const result = await db.query(query, values);
            return result.rows[0].accident_id;
}

async function getCrashDetails(crashList) {
    let successfulSaves = 0;
    const totalCrashes = crashList.length;

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

            await saveLocationData(crashData);
            const accident_id = await saveAccidentData(crashData);
            await saveDetailData(crashData, accident_id);

            const vehicles = await saveVehicleData(crashData, accident_id);

            for (let i = 0; i < crashData.PEDS; i++) {
                const victim_id = await savePersonData();
                await savePersonAccident(victim_id,accident_id);

                const respondent_id = await saveRespondentData(crashData.COUNTY);
                await saveIntervention(victim_id,accident_id,respondent_id);
            }

            for (let i = 0; i < vehicles.length; i++) {
                await saveVehicleAccident(vehicles[i][0], accident_id);

                for (let j = 0; j < vehicles[i][1] ; j++) {
                    const victim_id = await savePersonData();
                    await savePersonVehicle(victim_id,vehicles[i][0], (j===0));
                    await savePersonAccident(victim_id,accident_id);

                    const respondent_id = await saveRespondentData(crashData.COUNTY);
                    await saveIntervention(victim_id,accident_id,respondent_id);
                }
            }

            await db.query('COMMIT');
            successfulSaves++;
            
            // Display progress after every 10 successful saves
            if (successfulSaves % 10 === 0) {
                console.log(`[PROGRESS] Successfully processed ${successfulSaves}/${totalCrashes} crashes (${Math.round(successfulSaves/totalCrashes*100)}%)`);
            }

        } catch (error) {
            await db.query('ROLLBACK');
            console.error('[FAIL] Error saving accident data:', error);
            throw error;
        }
    }
    
    // Final progress report
    console.log(`\n[COMPLETE] Successfully processed ${successfulSaves}/${totalCrashes} crashes (${Math.round(successfulSaves/totalCrashes*100)}%)`);
}

processAllCrashData();