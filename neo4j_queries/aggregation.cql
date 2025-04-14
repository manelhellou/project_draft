MATCH (a:Accident)
WHERE a.drunk_driving = "t"
RETURN COUNT(a) AS drunk_driving_accidents;