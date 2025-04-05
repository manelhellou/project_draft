-- Find locations that had both accidents and severe weather conditions
SELECT l.lat, l.lon, l.city, l.state
FROM location l
JOIN accident a ON l.lat = a.lat AND a.lon = l.lon
INTERSECT
SELECT l.lat, l.lon, l.city, l.state
FROM location l
JOIN weather w ON l.lat = w.lat AND l.lon = w.long
WHERE w.weather_description IN ('Heavy rain', 'Heavy snow');

-- Find potentially dangerous incidents by querying the union of severe weather conditions and nighttime accidents
SELECT a.accident_id,a.time,l.city,l.state,w.weather_description
FROM accident a
JOIN location l ON a.lat = l.lat AND a.lon = l.lon
JOIN weather w ON a.lat = w.lat AND a.lon = w.long 
WHERE w.weather_description IN ('Heavy rain', 'Heavy snow', 'T-storm with hail', 'Freezing rain')

UNION

SELECT a.accident_id,a.time,l.city,l.state,w.weather_description
FROM accident a
JOIN location l ON a.lat = l.lat AND a.lon = l.lon
JOIN weather w ON a.lat = w.lat AND a.lon = w.long 
WHERE EXTRACT(HOUR FROM a.time) BETWEEN 20 AND 5;  -- Between 8 PM and 5 AM

-- Find accidents that occurred during normal weather conditions by taking the difference between accidents with severe weather incidents
SELECT a.accident_id,a.time,l.city,l.state,w.weather_description
FROM accident a
JOIN location l ON a.lat = l.lat AND a.lon = l.lon
JOIN weather w ON a.lat = w.lat AND a.lon = w.long 

EXCEPT

SELECT a.accident_id,a.time,l.city,l.state,w.weather_description
FROM accident a
JOIN location l ON a.lat = l.lat AND a.lon = l.lon
JOIN weather w ON a.lat = w.lat AND a.lon = w.long 
WHERE w.weather_description IN ('Heavy rain', 'Heavy snow', 'T-storm with hail', 'Freezing rain');

-- Equivalent queries without set operations:

-- 1. INTERSECT equivalent (using INNER JOIN)
SELECT DISTINCT l.lat, l.lon, l.city, l.state
FROM location l
JOIN accident a ON l.lat = a.lat AND l.lon = a.lon
JOIN weather w ON l.lat = w.lat AND l.lon = w.long
WHERE w.weather_description IN ('Heavy rain', 'Heavy snow');

-- 2. UNION equivalent (using OR condition)
SELECT DISTINCT a.accident_id, a.time, l.city, l.state, w.weather_description
FROM accident a
JOIN location l ON a.lat = l.lat AND a.lon = l.lon
JOIN weather w ON a.lat = w.lat AND a.lon = w.long 
WHERE w.weather_description IN ('Heavy rain', 'Heavy snow', 'T-storm with hail', 'Freezing rain')
   OR EXTRACT(HOUR FROM a.time) BETWEEN 20 AND 5;

-- 3. EXCEPT equivalent (using LEFT JOIN and NULL check)
SELECT DISTINCT a.accident_id, a.time, l.city, l.state, w.weather_description
FROM accident a
JOIN location l ON a.lat = l.lat AND a.lon = l.lon
JOIN weather w ON a.lat = w.lat AND a.lon = w.long 
LEFT JOIN (
    SELECT DISTINCT a2.accident_id
    FROM accident a2
    JOIN weather w2 ON a2.lat = w2.lat AND a2.lon = w2.long
    WHERE w2.weather_description IN ('Heavy rain', 'Heavy snow', 'T-storm with hail', 'Freezing rain')
) severe_weather ON a.accident_id = severe_weather.accident_id
WHERE severe_weather.accident_id IS NULL;








