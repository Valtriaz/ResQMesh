package storage

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

type Database struct {
	DB *sql.DB
}

type Emergency struct {
	ID        int64     `json:"id"`
	Type      string    `json:"type"`
	Severity  string    `json:"severity"`
	Latitude  *float64  `json:"latitude"`
	Longitude *float64  `json:"longitude"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

func NewDatabase(path string) (*Database, error) {
	dir := filepath.Dir(path)

	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf(
			"create database directory: %w",
			err,
		)
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf(
			"open database: %w",
			err,
		)
	}

	if err := db.Ping(); err != nil {
		_ = db.Close()

		return nil, fmt.Errorf(
			"ping database: %w",
			err,
		)
	}

	database := &Database{
		DB: db,
	}

	if err := database.migrate(); err != nil {
		_ = db.Close()

		return nil, fmt.Errorf(
			"database migration: %w",
			err,
		)
	}

	return database, nil
}

func (d *Database) migrate() error {
	schema := `
CREATE TABLE IF NOT EXISTS emergencies (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	type TEXT NOT NULL,
	severity TEXT NOT NULL,
	latitude REAL,
	longitude REAL,
	status TEXT NOT NULL DEFAULT 'received',
	created_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emergencies_created_at
	ON emergencies(created_at);

CREATE INDEX IF NOT EXISTS idx_emergencies_status
	ON emergencies(status);

CREATE INDEX IF NOT EXISTS idx_emergencies_severity
	ON emergencies(severity);

CREATE INDEX IF NOT EXISTS idx_emergencies_type
	ON emergencies(type);
`

	_, err := d.DB.Exec(schema)

	if err != nil {
		return fmt.Errorf(
			"apply database schema: %w",
			err,
		)
	}

	return nil
}

func (d *Database) CreateEmergency(
	emergency Emergency,
) (Emergency, error) {
	result, err := d.DB.Exec(`
INSERT INTO emergencies (
	type,
	severity,
	latitude,
	longitude,
	status,
	created_at
)
VALUES (?, ?, ?, ?, ?, ?)
`,
		emergency.Type,
		emergency.Severity,
		emergency.Latitude,
		emergency.Longitude,
		emergency.Status,
		emergency.CreatedAt,
	)

	if err != nil {
		return Emergency{}, fmt.Errorf(
			"insert emergency: %w",
			err,
		)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return Emergency{}, fmt.Errorf(
			"get emergency id: %w",
			err,
		)
	}

	emergency.ID = id

	return emergency, nil
}

func (d *Database) ListEmergencies(
	limit int,
) ([]Emergency, error) {
	if limit <= 0 {
		limit = 100
	}

	if limit > 500 {
		limit = 500
	}

	rows, err := d.DB.Query(`
SELECT
	id,
	type,
	severity,
	latitude,
	longitude,
	status,
	created_at
FROM emergencies
ORDER BY created_at DESC
LIMIT ?
`,
		limit,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"query emergencies: %w",
			err,
		)
	}

	defer rows.Close()

	emergencies := make([]Emergency, 0)

	for rows.Next() {
		var emergency Emergency

		if err := rows.Scan(
			&emergency.ID,
			&emergency.Type,
			&emergency.Severity,
			&emergency.Latitude,
			&emergency.Longitude,
			&emergency.Status,
			&emergency.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf(
				"scan emergency: %w",
				err,
			)
		}

		emergencies = append(
			emergencies,
			emergency,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf(
			"iterate emergencies: %w",
			err,
		)
	}

	return emergencies, nil
}

func (d *Database) GetEmergency(
	id int64,
) (Emergency, error) {
	var emergency Emergency

	err := d.DB.QueryRow(`
SELECT
	id,
	type,
	severity,
	latitude,
	longitude,
	status,
	created_at
FROM emergencies
WHERE id = ?
`,
		id,
	).Scan(
		&emergency.ID,
		&emergency.Type,
		&emergency.Severity,
		&emergency.Latitude,
		&emergency.Longitude,
		&emergency.Status,
		&emergency.CreatedAt,
	)

	if err != nil {
		return Emergency{}, fmt.Errorf(
			"get emergency %d: %w",
			id,
			err,
		)
	}

	return emergency, nil
}

func (d *Database) UpdateEmergencyStatus(
	id int64,
	status string,
) error {
	result, err := d.DB.Exec(`
UPDATE emergencies
SET status = ?
WHERE id = ?
`,
		status,
		id,
	)

	if err != nil {
		return fmt.Errorf(
			"update emergency %d: %w",
			id,
			err,
		)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf(
			"get updated row count: %w",
			err,
		)
	}

	if rowsAffected == 0 {
		return fmt.Errorf(
			"emergency %d not found",
			id,
		)
	}

	return nil
}

func (d *Database) Close() error {
	if d.DB == nil {
		return nil
	}

	return d.DB.Close()
}
