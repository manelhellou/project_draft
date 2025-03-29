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

async function processAllCrashData() {
    try {
        const crashes = await getCrashList();
        
        if (crashes.length === 0) {
            console.log("[FAIL] No crashes found. Exiting process.");
            return { locations: [], details: [] };
        }
        
        console.log(`[INFO] Processing all ${crashes.length} crashes...`);
        
        const result = await getCrashDetails(crashes);
        
        console.log("\nSummary Report");
        console.log("------------------");
        console.log(`[PASS] Total crashes processed: ${crashes.length}`);
        console.log(`[PASS] Details obtained: ${result.details.length}`);
        console.log(`[PASS] Locations mapped: ${result.locations.length}`);
        console.log(`[INFO] Both arrays have ${result.locations.length === result.details.length ? 'matching' : 'different'} sizes`);
        
        return result; // return an object with locations array and details array
    } catch (error) {
        console.error("[FAIL] Error in processing crash data:", error);
        return { locations: [], details: [] };
    }
}

const crashDataResult = processAllCrashData();