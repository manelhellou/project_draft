MATCH (a:Accident)
WHERE a.drunk_driving = "t"
RETURN a.accident_id, a.time, a.light_condition
ORDER BY a.time DESC
LIMIT 5;