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
	directory := filepath.Dir(path)

	if directory != "." {
		if err := os.MkdirAll(directory, 0755); err != nil {
			return nil, fmt.Errorf(
				"create database directory: %w",
				err,
			)
		}
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
	_, err := d.DB.Exec(`
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
	`)

	return err
}

func (d *Database) CreateEmergency(
	emergency Emergency,
) (Emergency, error) {
	var latitude any
	var longitude any

	if emergency.Latitude != nil {
		latitude = *emergency.Latitude
	}

	if emergency.Longitude != nil {
		longitude = *emergency.Longitude
	}

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
		latitude,
		longitude,
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
			"get emergency ID: %w",
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
	`, limit)

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

func (d *Database) Close() error {
	return d.DB.Close()
}
