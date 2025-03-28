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

const API_KEY = process.env.API_KEY;

// Locations
const jsonData = JSON.parse(fs.readFileSync('us_cities.json', 'utf8'));
const locations = jsonData.map(city => ({
    lat: city.city.coord.lat,
    lon: city.city.coord.lon,
    city: city.city.name
}));

console.log(`Loaded ${locations.length} locations.`);


// Fetch weather data for the specified location
const fetchWeather = async (lat, lon, city, startTime, endTime) => {
    try {
        const url = `https://history.openweathermap.org/data/2.5/history/city?lat=${lat}&lon=${lon}&type=hour&start=${startTime}&end=${endTime}&appid=${API_KEY}`;
    
        console.log(`Fetching data from: ${url}`);

        const response = await axios.get(url);
        const data = response.data;

        const hourlyData = data.list.map((hourlyRecord) => {
            // Get the weather object (first element in the "weather" array)
            const weather = hourlyRecord.weather[0];

            return {
                lat: lat, 
                lon: lon,
                city: city,
                timestamp: hourlyRecord.dt,  
                temp: hourlyRecord.main.temp,
                feels_like: hourlyRecord.main.feels_like,
                pressure: hourlyRecord.main.pressure,
                humidity: hourlyRecord.main.humidity,
                temp_min: hourlyRecord.main.temp_min,
                temp_max: hourlyRecord.main.temp_max,
                wind_speed: hourlyRecord.wind.speed,
                wind_direction: hourlyRecord.wind.deg,
                cloudiness: hourlyRecord.clouds.all,
                main: weather.main,
                description: weather.description,
                weather_id: weather.id,  
                rain_1h: hourlyRecord.rain ? hourlyRecord.rain['1h'] || 0 : 0,
                rain_3h: hourlyRecord.rain ? hourlyRecord.rain['3h'] || 0 : 0,
                snow_1h: hourlyRecord.snow ? hourlyRecord.snow['1h'] || 0 : 0,
                snow_3h: hourlyRecord.snow ? hourlyRecord.snow['3h'] || 0 : 0,
            };
        });

        return hourlyData;
    
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
                        lat, long, city, weather_id, timestamp, temp, feels_like, pressure, humidity, temp_min, temp_max, 
                        wind_speed, wind_direction, cloudiness, main, description, rain_1h, rain_3h, snow_1h, snow_3h
                    ) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                `;

        for (const record of weatherData) {
            const values = [
                record.lat, 
                record.lon,
                record.city,
                record.weather_id,  
                record.timestamp,
                record.temp,
                record.feels_like,
                record.pressure,
                record.humidity,
                record.temp_min,
                record.temp_max,
                record.wind_speed,
                record.wind_direction,
                record.cloudiness,
                record.main,
                record.description,
                record.rain_1h,
                record.rain_3h,
                record.snow_1h,
                record.snow_3h
            ];

            await db.query(query, values);
        }

        console.log("Weather data inserted successfully.");
    } catch (error) {
        console.error("Failed to insert weather data:", error.message);
    }
};

// Fetch and insert weather data for all locations
const fetchAndInsertWeatherData = async () => {
    const currentTime = Math.floor(Date.now() / 1000);  // current timestamp in seconds
    const oneYearAgo = currentTime - (365.25 * 24 * 60 * 60); // 2 years ago in Unix timestamp

    for (const location of locations) {
        const { lat, lon, city } = location;
        let startTime = oneYearAgo;
        
        // Loop over the time range, requesting one week of data at a time
        while (startTime < currentTime) {
            const endTime = Math.min(startTime + (7 * 24 * 60 * 60), currentTime);  // 7 days later, but not beyond current time
            const weatherData = await fetchWeather(lat, lon, city, startTime, endTime);

            if (weatherData) {
                await insertWeatherData(weatherData);
            }

            startTime = endTime;  // Move the start time to the end time for the next week
        }
    }

    // Close the database connection
    db.end();
};

// Start the process
fetchAndInsertWeatherData();
