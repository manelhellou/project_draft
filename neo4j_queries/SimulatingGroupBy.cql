MATCH (a:Accident)
WITH a.light_condition AS condition, COUNT(*) AS total_accidents
RETURN condition, total_accidents
ORDER BY total_accidents DESC;