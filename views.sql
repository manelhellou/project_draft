CREATE ROLE limited_viewer;
CREATE ROLE full_viewer;

CREATE VIEW full_victim_info as
	Select
		a.accident_id,
		a.evenement_name,
		a.time,
		r.injured,
		r.injury_desc
	From 
		accident a
	Join 
		accident_victim r on a.accident_id = r.accident_id;
		
	

CREATE VIEW anonymized_victim as
Select
		a.accident_id,
		a.evenement_name,
		a.time,
		a.lat,
		a.lon,
		r.injured,
		r.injury_desc
		
	From 
		accident a
	Join 
		accident_victim r on a.accident_id = r.accident_id
	Join 
		victim v on r.victim_id = v.victim_id;





GRANT USAGE ON SCHEMA public TO limited_viewer;
GRANT SELECT ON anonymized_victim TO limited_viewer;

GRANT USAGE ON SCHEMA public TO full_viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO full_viewer;