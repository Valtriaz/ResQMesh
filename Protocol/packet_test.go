package Protocol

import (
	"bytes"
	"testing"
)

func TestPacketEncodeDecode(t *testing.T) {
	latitude := 19.076
	longitude := 72.8777

	original := NewEmergencyPacket(
		123456789,
		42,
		7,
		SeverityCritical,
		[]byte(`{"emergency":"MEDICAL"}`),
	)

	if err := original.SetLocation(
		latitude,
		longitude,
	); err != nil {
		t.Fatalf(
			"set location failed: %v",
			err,
		)
	}

	encoded, err := Encode(*original)
	if err != nil {
		t.Fatalf(
			"encode failed: %v",
			err,
		)
	}

	decoded, err := Decode(encoded)
	if err != nil {
		t.Fatalf(
			"decode failed: %v",
			err,
		)
	}

	if decoded.PacketID != original.PacketID {
		t.Fatalf("packet ID mismatch")
	}

	if decoded.SourceID != original.SourceID {
		t.Fatalf("source ID mismatch")
	}

	if decoded.DestinationID != original.DestinationID {
		t.Fatalf("destination ID mismatch")
	}

	if decoded.Sequence != original.Sequence {
		t.Fatalf("sequence mismatch")
	}

	if decoded.Type != original.Type {
		t.Fatalf("type mismatch")
	}

	if decoded.Severity != original.Severity {
		t.Fatalf("severity mismatch")
	}

	if decoded.TTL != original.TTL {
		t.Fatalf("TTL mismatch")
	}

	if decoded.HopCount != original.HopCount {
		t.Fatalf("hop count mismatch")
	}

	if !decoded.HasLocation() {
		t.Fatalf("location was lost")
	}

	if *decoded.Latitude != latitude {
		t.Fatalf(
			"latitude mismatch: got %f want %f",
			*decoded.Latitude,
			latitude,
		)
	}

	if *decoded.Longitude != longitude {
		t.Fatalf(
			"longitude mismatch: got %f want %f",
			*decoded.Longitude,
			longitude,
		)
	}

	if !bytes.Equal(
		decoded.Payload,
		original.Payload,
	) {
		t.Fatalf("payload mismatch")
	}
}

func TestPacketWithoutLocation(
	t *testing.T,
) {
	packet := NewEmergencyPacket(
		1,
		2,
		1,
		SeverityHigh,
		[]byte("SOS"),
	)

	encoded, err := Encode(*packet)
	if err != nil {
		t.Fatalf(
			"encode failed: %v",
			err,
		)
	}

	decoded, err := Decode(encoded)
	if err != nil {
		t.Fatalf(
			"decode failed: %v",
			err,
		)
	}

	if decoded.HasLocation() {
		t.Fatalf(
			"packet unexpectedly has location",
		)
	}

	if decoded.Latitude != nil {
		t.Fatalf(
			"latitude should be nil",
		)
	}

	if decoded.Longitude != nil {
		t.Fatalf(
			"longitude should be nil",
		)
	}
}

func TestPacketForward(t *testing.T) {
	packet := NewEmergencyPacket(
		100,
		10,
		1,
		SeverityCritical,
		[]byte("SOS"),
	)

	initialTTL := packet.TTL

	if err := packet.Forward(); err != nil {
		t.Fatalf(
			"forward failed: %v",
			err,
		)
	}

	if packet.TTL != initialTTL-1 {
		t.Fatalf(
			"TTL not decremented",
		)
	}

	if packet.HopCount != 1 {
		t.Fatalf(
			"hop count not incremented",
		)
	}
}
