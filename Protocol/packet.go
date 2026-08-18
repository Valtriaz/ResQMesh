package Protocol

import (
	"errors"
	"fmt"
	"time"
)

const (
	ProtocolMagic   uint16 = 0x5251 // "RQ"
	ProtocolVersion uint8  = 1
	HeaderSize             = 54
	AuthTagSize            = 16
	MaxPacketSize          = 192
	MaxPayloadSize         = MaxPacketSize - HeaderSize - AuthTagSize
	MaxTTL          uint8  = 16
	GatewayNodeID   uint64 = 0
)

// PacketType identifies what kind of message this is.
type PacketType uint8

const (
	PacketTypeEmergency PacketType = 1
	PacketTypeSafe      PacketType = 2
	PacketTypeAck       PacketType = 3
	PacketTypeHello     PacketType = 4
	PacketTypeHealth    PacketType = 5
)

// Severity determines delivery priority.
type Severity uint8

const (
	SeverityLow      Severity = 1
	SeverityMedium   Severity = 2
	SeverityHigh     Severity = 3
	SeverityCritical Severity = 4
)

// Flags describe optional packet properties.
type Flags uint16

const (
	FlagHasLocation Flags = 1 << iota
	FlagEncrypted
	FlagAcknowledgementRequired
	FlagGatewayBound
	FlagPriority
)

// Packet is the logical representation of a ResQMesh packet.
//
// The binary representation is defined in codec.go and SPEC.md.
// Keep this structure transport-independent.
type Packet struct {
	PacketID uint64

	SourceID      uint64
	DestinationID uint64

	Sequence  uint32
	Timestamp uint32

	Type     PacketType
	Severity Severity
	Flags    Flags

	TTL      uint8
	HopCount uint8

	Latitude  *float64
	Longitude *float64

	Payload []byte

	AuthTag [AuthTagSize]byte
}

func NewEmergencyPacket(
	packetID uint64,
	sourceID uint64,
	sequence uint32,
	severity Severity,
	payload []byte,
) *Packet {
	packet := &Packet{
		PacketID:      packetID,
		SourceID:      sourceID,
		DestinationID: GatewayNodeID,
		Sequence:      sequence,
		Timestamp:     uint32(time.Now().Unix()),
		Type:          PacketTypeEmergency,
		Severity:      severity,
		Flags:         FlagGatewayBound | FlagAcknowledgementRequired,
		TTL:           MaxTTL,
		HopCount:      0,
		Payload:       append([]byte(nil), payload...),
	}

	return packet
}

func (p *Packet) SetLocation(
	latitude float64,
	longitude float64,
) error {
	if latitude < -90 || latitude > 90 {
		return errors.New("latitude out of range")
	}

	if longitude < -180 || longitude > 180 {
		return errors.New("longitude out of range")
	}

	p.Latitude = &latitude
	p.Longitude = &longitude
	p.Flags |= FlagHasLocation

	return nil
}

func (p *Packet) ClearLocation() {
	p.Latitude = nil
	p.Longitude = nil
	p.Flags &^= FlagHasLocation
}

func (p Packet) HasLocation() bool {
	return p.Flags&FlagHasLocation != 0 &&
		p.Latitude != nil &&
		p.Longitude != nil
}

func (p Packet) IsGatewayBound() bool {
	return p.Flags&FlagGatewayBound != 0
}

func (p Packet) RequiresAcknowledgement() bool {
	return p.Flags&FlagAcknowledgementRequired != 0
}

func (p Packet) IsExpired() bool {
	return p.TTL == 0
}

func (p *Packet) Forward() error {
	if p.TTL == 0 {
		return errors.New("packet TTL expired")
	}

	p.TTL--
	p.HopCount++

	return nil
}

func (p Packet) Validate() error {
	if p.PacketID == 0 {
		return errors.New("packet ID cannot be zero")
	}

	if p.SourceID == 0 {
		return errors.New("source node ID cannot be zero")
	}

	if p.Type == 0 {
		return errors.New("packet type is required")
	}

	if p.Severity == 0 {
		return errors.New("packet severity is required")
	}

	if p.TTL > MaxTTL {
		return fmt.Errorf(
			"TTL %d exceeds maximum %d",
			p.TTL,
			MaxTTL,
		)
	}

	if len(p.Payload) > MaxPayloadSize {
		return fmt.Errorf(
			"payload size %d exceeds maximum %d",
			len(p.Payload),
			MaxPayloadSize,
		)
	}

	if p.Flags&FlagHasLocation != 0 {
		if p.Latitude == nil || p.Longitude == nil {
			return errors.New(
				"location flag set but coordinates are missing",
			)
		}

		if *p.Latitude < -90 || *p.Latitude > 90 {
			return errors.New("latitude out of range")
		}

		if *p.Longitude < -180 || *p.Longitude > 180 {
			return errors.New("longitude out of range")
		}
	}

	return nil
}
