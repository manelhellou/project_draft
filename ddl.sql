--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.0

-- Started on 2025-04-04 23:45:14 EDT

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 238 (class 1255 OID 17145)
-- Name: check_respondent_county_match(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_respondent_county_match() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
	accident_county TEXT;
	respondent_counties TEXT[];
BEGIN
	select county into accident_county
	from accident a join location l on (a.lat = l.lat and a.lon = l.lon)
	where a.accident_id = new.accident_id;

	select e.counties into respondent_counties
	from emegency_respondent e
	where e.respondent_id == new.respondent_id;

	IF accident_county = ANY(respondent_counties) THEN
        RETURN NEW; 
    ELSE
        RAISE EXCEPTION 'respondent allowed in counties: %, accident in county: %. cannot match', respondent_counties, accident_county;
    END IF;
END;
$$;


ALTER FUNCTION public.check_respondent_county_match() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 16959)
-- Name: accident; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accident (
    accident_id integer NOT NULL,
    weather_id integer,
    state_case integer,
    "time" date,
    evenement_name text,
    lat numeric,
    lon numeric
);


ALTER TABLE public.accident OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16958)
-- Name: accident_accident_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accident_accident_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accident_accident_id_seq OWNER TO postgres;

--
-- TOC entry 4426 (class 0 OID 0)
-- Dependencies: 220
-- Name: accident_accident_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accident_accident_id_seq OWNED BY public.accident.accident_id;


--
-- TOC entry 233 (class 1259 OID 17078)
-- Name: accident_vehicle; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accident_vehicle (
    accident_id integer NOT NULL,
    vin character varying(17) NOT NULL,
    damaged_part integer[]
);


ALTER TABLE public.accident_vehicle OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 17063)
-- Name: accident_victim; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accident_victim (
    accident_id integer NOT NULL,
    victim_id integer NOT NULL,
    injured boolean,
    injury_desc text
);


ALTER TABLE public.accident_victim OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 17005)
-- Name: victim; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.victim (
    victim_id integer NOT NULL,
    contact_info text,
    ssn text,
    first_name text,
    last_name text,
    date_of_birth date,
    sex text,
    health_insurance boolean
);


ALTER TABLE public.victim OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 17156)
-- Name: anonymized_victim; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.anonymized_victim AS
 SELECT a.accident_id,
    a.evenement_name,
    a."time",
    a.lat,
    a.lon,
    r.injured,
    r.injury_desc
   FROM ((public.accident a
     JOIN public.accident_victim r ON ((a.accident_id = r.accident_id)))
     JOIN public.victim v ON ((r.victim_id = v.victim_id)));


ALTER VIEW public.anonymized_victim OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16986)
-- Name: details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.details (
    detail_id integer NOT NULL,
    detail_information text,
    light_condition text,
    road_function text,
    intersection_type text,
    drunk_driving boolean
);


ALTER TABLE public.details OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16985)
-- Name: details_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.details_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.details_detail_id_seq OWNER TO postgres;

--
-- TOC entry 4432 (class 0 OID 0)
-- Dependencies: 222
-- Name: details_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.details_detail_id_seq OWNED BY public.details.detail_id;


--
-- TOC entry 228 (class 1259 OID 17014)
-- Name: emergency_respondent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emergency_respondent (
    respondent_id integer NOT NULL,
    type text,
    contact_info text,
    ssn text,
    first_name text,
    last_name text,
    date_of_birth date,
    sex text,
    counties text[]
);


ALTER TABLE public.emergency_respondent OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17013)
-- Name: emergency_respondent_respondent_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emergency_respondent_respondent_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emergency_respondent_respondent_id_seq OWNER TO postgres;

--
-- TOC entry 4434 (class 0 OID 0)
-- Dependencies: 227
-- Name: emergency_respondent_respondent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emergency_respondent_respondent_id_seq OWNED BY public.emergency_respondent.respondent_id;


--
-- TOC entry 236 (class 1259 OID 17152)
-- Name: full_victim_info; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.full_victim_info AS
 SELECT a.accident_id,
    a.evenement_name,
    a."time",
    r.injured,
    r.injury_desc
   FROM (public.accident a
     JOIN public.accident_victim r ON ((a.accident_id = r.accident_id)));


ALTER VIEW public.full_victim_info OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 17038)
-- Name: intervention; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.intervention (
    intervention_id integer NOT NULL,
    victim_id integer NOT NULL,
    accident_id integer NOT NULL,
    respondent_id integer NOT NULL,
    arrival_time date,
    intervention_details text
);


ALTER TABLE public.intervention OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 17037)
-- Name: intervention_intervention_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.intervention_intervention_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.intervention_intervention_id_seq OWNER TO postgres;

--
-- TOC entry 4437 (class 0 OID 0)
-- Dependencies: 230
-- Name: intervention_intervention_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.intervention_intervention_id_seq OWNED BY public.intervention.intervention_id;


--
-- TOC entry 217 (class 1259 OID 16946)
-- Name: location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location (
    lat numeric NOT NULL,
    lon numeric NOT NULL,
    state text,
    city text,
    route integer,
    route_name text,
    county text
);


ALTER TABLE public.location OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 17097)
-- Name: person; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.person (
    "SSN" integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    date_of_birth date
);


ALTER TABLE public.person OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 17096)
-- Name: person_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.person_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.person_id_seq OWNER TO postgres;

--
-- TOC entry 4440 (class 0 OID 0)
-- Dependencies: 234
-- Name: person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.person_id_seq OWNED BY public.person."SSN";


--
-- TOC entry 224 (class 1259 OID 16999)
-- Name: vehicle; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle (
    vin character varying(17) NOT NULL,
    maker text,
    model text,
    type text,
    color text,
    model_year integer
);


ALTER TABLE public.vehicle OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 17022)
-- Name: vehicle_victim; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_victim (
    victim_id integer NOT NULL,
    vin character varying(17) NOT NULL,
    driving boolean
);


ALTER TABLE public.vehicle_victim OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 17004)
-- Name: victim_victim_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.victim_victim_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.victim_victim_id_seq OWNER TO postgres;

--
-- TOC entry 4443 (class 0 OID 0)
-- Dependencies: 225
-- Name: victim_victim_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.victim_victim_id_seq OWNED BY public.victim.victim_id;


--
-- TOC entry 219 (class 1259 OID 16952)
-- Name: weather; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weather (
    weather_id integer NOT NULL,
    lat double precision,
    lon double precision,
    "time" date,
    unix_timestamp bigint,
    weather_description text,
    temperature double precision,
    apparent_temperature double precision,
    precipitation double precision,
    rain double precision,
    snowfall double precision,
    snow_depth double precision,
    cloud_cover integer,
    cloud_cover_low integer,
    cloud_cover_mid integer,
    cloud_cover_high integer,
    wind_speed_10m double precision,
    wind_speed_100m double precision,
    wind_direction_10m double precision,
    wind_direction_100m double precision,
    wind_gusts_10m double precision
);


ALTER TABLE public.weather OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16951)
-- Name: weather_weather_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weather_weather_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weather_weather_id_seq OWNER TO postgres;

--
-- TOC entry 4445 (class 0 OID 0)
-- Dependencies: 218
-- Name: weather_weather_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.weather_weather_id_seq OWNED BY public.weather.weather_id;


--
-- TOC entry 4208 (class 2604 OID 16962)
-- Name: accident accident_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accident ALTER COLUMN accident_id SET DEFAULT nextval('public.accident_accident_id_seq'::regclass);


--
-- TOC entry 4209 (class 2604 OID 16989)
-- Name: details detail_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.details ALTER COLUMN detail_id SET DEFAULT nextval('public.details_detail_id_seq'::regclass);


--
-- TOC entry 4211 (class 2604 OID 17017)
-- Name: emergency_respondent respondent_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_respondent ALTER COLUMN respondent_id SET DEFAULT nextval('public.emergency_respondent_respondent_id_seq'::regclass);


--
-- TOC entry 4212 (class 2604 OID 17041)
-- Name: intervention intervention_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention ALTER COLUMN intervention_id SET DEFAULT nextval('public.intervention_intervention_id_seq'::regclass);


--
-- TOC entry 4213 (class 2604 OID 17100)
-- Name: person SSN; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person ALTER COLUMN "SSN" SET DEFAULT nextval('public.person_id_seq'::regclass);


--
-- TOC entry 4210 (class 2604 OID 17008)
-- Name: victim victim_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.victim ALTER COLUMN victim_id SET DEFAULT nextval('public.victim_victim_id_seq'::regclass);


--
-- TOC entry 4207 (class 2604 OID 16955)
-- Name: weather weather_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weather ALTER COLUMN weather_id SET DEFAULT nextval('public.weather_weather_id_seq'::regclass);


--
-- TOC entry 4424 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO victor_db;
GRANT USAGE ON SCHEMA public TO limited_viewer;
GRANT USAGE ON SCHEMA public TO full_viewer;


--
-- TOC entry 4425 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE accident; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.accident TO victor_db;
GRANT SELECT ON TABLE public.accident TO full_viewer;


--
-- TOC entry 4427 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE accident_vehicle; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.accident_vehicle TO victor_db;
GRANT SELECT ON TABLE public.accident_vehicle TO full_viewer;


--
-- TOC entry 4428 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE accident_victim; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.accident_victim TO victor_db;
GRANT SELECT ON TABLE public.accident_victim TO full_viewer;


--
-- TOC entry 4429 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE victim; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.victim TO victor_db;
GRANT SELECT ON TABLE public.victim TO full_viewer;


--
-- TOC entry 4430 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE anonymized_victim; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.anonymized_victim TO victor_db;
GRANT SELECT ON TABLE public.anonymized_victim TO limited_viewer;
GRANT SELECT ON TABLE public.anonymized_victim TO full_viewer;


--
-- TOC entry 4431 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE details; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.details TO victor_db;
GRANT SELECT ON TABLE public.details TO full_viewer;


--
-- TOC entry 4433 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE emergency_respondent; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.emergency_respondent TO victor_db;
GRANT SELECT ON TABLE public.emergency_respondent TO full_viewer;


--
-- TOC entry 4435 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE full_victim_info; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.full_victim_info TO victor_db;
GRANT SELECT ON TABLE public.full_victim_info TO full_viewer;


--
-- TOC entry 4436 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE intervention; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.intervention TO victor_db;
GRANT SELECT ON TABLE public.intervention TO full_viewer;


--
-- TOC entry 4438 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE location; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.location TO victor_db;
GRANT SELECT ON TABLE public.location TO full_viewer;


--
-- TOC entry 4439 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE person; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.person TO victor_db;
GRANT SELECT ON TABLE public.person TO full_viewer;


--
-- TOC entry 4441 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE vehicle; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.vehicle TO victor_db;
GRANT SELECT ON TABLE public.vehicle TO full_viewer;


--
-- TOC entry 4442 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE vehicle_victim; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.vehicle_victim TO victor_db;
GRANT SELECT ON TABLE public.vehicle_victim TO full_viewer;


--
-- TOC entry 4444 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE weather; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.weather TO victor_db;
GRANT SELECT ON TABLE public.weather TO full_viewer;


-- Completed on 2025-04-04 23:45:21 EDT

--
-- PostgreSQL database dump complete
--

