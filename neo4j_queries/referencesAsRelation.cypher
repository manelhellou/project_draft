

MATCH (a:Accident), (w:Weather)
WHERE a.lat = w.lat AND a.lon = w.lon AND a.time = Date(w.time)
CREATE (a)-[:weather_accident]->(w)
RETURN a, w;