MATCH (a:Accident)
WHERE a.light_condition = "Daylight"
RETURN a.accident_id, a.light_condition, a.time;