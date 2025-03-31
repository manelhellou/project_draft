require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');
const fs = require('fs');


// Database connection setup
const db = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// Connect to the database
db.connect()
    .then(() => console.log("Connected to the database"))
    .catch(err => console.error("Connection error", err.stack));

// Fetch weather data for the specified location
const fetchWeather = async (lat, lon) => {
    try {
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2022-01-01&end_date=2022-12-31&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,rain,snowfall,snow_depth,weather_code,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_speed_100m,wind_direction_10m,wind_direction_100m,wind_gusts_10m`;
        console.log(`Fetching data from: ${url}`);

        const response = await axios.get(url);
        const data = response.data;

        const codeToDescription = {
            "0" : "Clear",
            "1" : "Mostly clear",
            "2" : "Partly cloudy",
            "3" : "Overcast", 
            "45" : "Fog",
            "48" : "Icy fog",
            "51" : "Light drizzle",
            "53" : "Drizzle", 
            "55" : "Heavy drizzle",
            "80" : "Light showers",
            "81" : "Showers",
            "82" : "Heavy showers", 
            "61" : "Light rain",
            "63" : "Rain",
            "65" : "Heavy rain",
            "56" : "Light freezing drizzle", 
            "57" : "Freezing drizzle",
            "66" : "Light freezing rain",
            "67" : "Freezing rain",
            "77" : "Snow grains", 
            "85" : "Light snow showers",
            "86" : "Snow showers",
            "71" : "Light snow",
            "73" : "Snow", 
            "75" : "Heavy snow",
            "95" : "Thunderstorm",
            "96" : "Light T-storm with hail",
            "99" : "T-storm with hail"           
        }
        // Check if hourly data exists
        if (data.hourly && data.hourly.time && data.hourly.time.length > 0) {

            const hourlyData = data.hourly.time.map((time, index) => {
                const unixTimestamp = Math.floor(new Date(time).getTime() / 1000); 

                return {
                    lat: lat,
                    lon: lon,
                    timestamp: time, 
                    unixTimestamp: unixTimestamp, 
                    temperature: data.hourly.temperature_2m[index],
                    humidity: data.hourly.relative_humidity_2m[index],
                    dewPoint: data.hourly.dew_point_2m[index],
                    apparentTemperature: data.hourly.apparent_temperature[index],
                    precipitation: data.hourly.precipitation[index],
                    rain: data.hourly.rain[index],
                    snowfall: data.hourly.snowfall[index],
                    snowDepth: data.hourly.snow_depth[index],
                    weatherDescription: codeToDescription[data.hourly.weather_code[index]],
                    cloudCover: data.hourly.cloud_cover[index],
                    cloudCoverLow: data.hourly.cloud_cover_low[index],
                    cloudCoverMid: data.hourly.cloud_cover_mid[index],
                    cloudCoverHigh: data.hourly.cloud_cover_high[index],
                    windSpeed10m: data.hourly.wind_speed_10m[index],
                    windSpeed100m: data.hourly.wind_speed_100m[index],
                    windDirection10m: data.hourly.wind_direction_10m[index],
                    windDirection100m: data.hourly.wind_direction_100m[index],
                    windGusts10m: data.hourly.wind_gusts_10m[index]
                };
            });

            return hourlyData;
        } else {
            console.error(`No hourly data found for ${city}`);
            return null;
        }

    } catch (error) {
        console.error(`Failed to fetch weather data for (${lat}, ${lon}):`, error.message);
        return null;
    }
};


// Insert weather data into the database
const insertWeatherData = async (weatherData) => {
    try {
        const query = `
                    INSERT INTO weather_history (
                        lat, long, time, unix_timestamp, weather_description, temperature, relative_humidity, dew_point, apparent_temperature, 
                        precipitation, rain, snowfall, snow_depth, cloud_cover, cloud_cover_low, cloud_cover_mid, 
                        cloud_cover_high, wind_speed_10m, wind_speed_100m, wind_direction_10m, wind_direction_100m, 
                        wind_gusts_10m
                    ) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                `;

        for (const record of weatherData) {
            const values = [
                record.lat, 
                record.lon,
                record.timestamp,
                record.unixTimestamp,
                record.weatherDescription,  
                record.temperature,
                record.humidity,
                record.dewPoint,
                record.apparentTemperature,
                record.precipitation,
                record.rain,
                record.snowfall,
                record.snowDepth,
                record.cloudCover,
                record.cloudCoverLow,
                record.cloudCoverMid,
                record.cloudCoverHigh,
                record.windSpeed10m,
                record.windSpeed100m,
                record.windDirection10m,
                record.windDirection100m,
                record.windGusts10m
            ];

            await db.query(query, values);
        }

        console.log("Weather data inserted successfully.");
    } catch (error) {
        console.error("Failed to insert weather data:", error.message);
    }
};


// Fetch and insert weather data for all locations
const fetchAndInsertWeatherData = async (locations) => {
    for (const location of locations) {
        const { latitude: lat, longitude: lon } = location;
        
        const weatherData = await fetchWeather(lat, lon);

        if (weatherData) {
            await insertWeatherData(weatherData);
        }
    }

    // Close the database connection
    db.end();
};

async function main() {
    const carCrashFile = await import("./fetch_carCrash.mjs");
    const crashInfo = await carCrashFile.processAllCrashData();

    //API has a maximum of calls per hour, so we will separate it in 2 
    const half = Math.floor(crashInfo.locations.length / 2); 

    //Arguments to pass in command line
    const processFirstHalf = process.argv.includes("--first");
    const processSecondHalf = process.argv.includes("--second");

    let locations;
    if (processFirstHalf) {
        locations = crashInfo.locations.slice(0, half);
    } else if (processSecondHalf) {
        locations = crashInfo.locations.slice(half);
    } else {
        console.log("Please specify --first or --second");
        return;
    }

    fetchAndInsertWeatherData(locations);
}

main();
