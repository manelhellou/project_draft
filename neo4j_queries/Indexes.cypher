--referencesAsRelation
    CREATE INDEX lat_lon_time FOR (a:Accident) ON (a.lat, a.lon, a.time);
    CREATE INDEX lat_lon_time_weather FOR (a:Weather) ON (a.lat, a.lon, a.time);
    CREATE INDEX lat_lon FOR (a:Location) ON (a.lat, a.lon);




--aggregation (accident.drunk_driving)
    CREATE INDEX drunk_driving_index FOR (a:Accident) ON (a.drunk_driving);


--basic search (accident.light_condition)
    CREATE INDEX light_condition_index FOR (a:Accident) ON (a.light_condition);

--group by simulation (accident.light_condition done)
--topN entities (accident.drunk_driving done)

-- fullText Search (HAS_VICTIM injury_desc)
    CREATE FULLTEXT INDEX injury_index FOR ()-[r:HAS_VICTIM]->() ON EACH [r.injury_desc];