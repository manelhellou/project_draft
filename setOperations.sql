-- Find locations that had both accidents and severe weather conditions
SELECT l.lat, l.lon, l.city, l.state
FROM location l
JOIN accident a ON l.lat = a.lat AND l.lon = a.lon
INTERSECT
SELECT l.lat, l.lon, l.city, l.state
FROM location l
JOIN weather w ON l.lat = w.lat AND l.lon = w.long
WHERE w.weather_description IN ('Heavy rain', 'Heavy snow');