CREATE OR REPLACE FUNCTION check_respondent_county_match()
RETURNS TRIGGER AS $$
DECLARE
	accident_county TEXT;
	respondent_counties TEXT[];
BEGIN
	select county into accident_county
	from accident a join location l on (a.lat = l.lat and a.lon = l.lon)
	where a.accident_id == new.accident_id;

	select e.counties into respondent_counties
	from emegency_respondent e
	where e.respondent_id == new.respondent_id;

	IF accident_county = ANY(respondent_counties) THEN
        RETURN NEW; 
    ELSE
        RAISE EXCEPTION 'respondent allowed in counties: %, accident in county: %. cannot match', respondent_counties, accident_county;
    END IF;
END;
$$ LANGUAGE plpgsql;	

CREATE TRIGGER check_respondent_county_before_insert
BEFORE INSERT ON intervention
FOR EACH ROW
EXECUTE FUNCTION check_respondent_county_match();