# Run this one time to update a version 241026 database to a version 250116 database
# sqlite3 lociterm.db < thisfile.sql
.bail on

# Going to start storing all mssp queries in a seperate MSSP table instead of
# storing only the most recent mssp data directly in the gamedb table.

CREATE TABLE MSSP (
	ID INTEGER NOT NULL PRIMARY KEY,
	GAME INTEGER NOT NULL,
	CREATED DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	MSSP JSONB,
	FOREIGN KEY(GAME) REFERENCES GAMEDB(ID)
);

INSERT INTO MSSP ( GAME, CREATED, MSSP )
SELECT ID, LAST_MSSP, MSSP
FROM GAMEDB
WHERE MSSP IS NOT NULL;

# name website and icon are only used as a non-mssp override going forward
UPDATE GAMEDB SET
	NAME = NULL,
	WEBSITE = NULL,
	ICON = NULL;

ALTER TABLE GAMEDB RENAME COLUMN LAST_UPDATE TO GAME_UPDATED;
ALTER TABLE GAMEDB DROP COLUMN MSSP;

# add the dbversion to the table.
INSERT INTO DBVERSION ("VERSION") VALUES ( 250116 );

.print DB updated to 250116.
