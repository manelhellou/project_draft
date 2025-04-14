
-- using index
CALL db.index.fulltext.queryRelationships('injury_index', 'Neck sprain') YIELD relationship, score
RETURN relationship, score;

--without index
MATCH ()-[r:HAS_VICTIM]->()
WHERE r.injury_desc CONTAINS 'Neck sprain'
RETURN r AS relationship;