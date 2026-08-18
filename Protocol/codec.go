package Protocol

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"math"
)

var byteOrder = binary.LittleEndian

func Encode(packet Packet) ([]byte, error) {
	if err := packet.Validate(); err != nil {
		return nil, fmt.Errorf(
			"cannot encode packet: %w",
			err,
		)
	}

	var buffer bytes.Buffer

	buffer.Grow(MaxPacketSize)

	// Magic
	_ = binary.Write(
		&buffer,
		byteOrder,
		ProtocolMagic,
	)

	// Version
	_ = buffer.WriteByte(ProtocolVersion)

	// Header size
	_ = buffer.WriteByte(HeaderSize)

	// Packet identity
	_ = binary.Write(
		&buffer,
		byteOrder,
		packet.PacketID,
	)

	_ = binary.Write(
		&buffer,
		byteOrder,
		packet.SourceID,
	)

	_ = binary.Write(
		&buffer,
		byteOrder,
		packet.DestinationID,
	)

	// Sequence / timestamp
	_ = binary.Write(
		&buffer,
		byteOrder,
		packet.Sequence,
	)

	_ = binary.Write(
		&buffer,
		byteOrder,
		packet.Timestamp,
	)

	// Metadata
	_ = buffer.WriteByte(byte(packet.Type))
	_ = buffer.WriteByte(byte(packet.Severity))

	_ = binary.Write(
		&buffer,
		byteOrder,
		uint16(packet.Flags),
	)

	_ = buffer.WriteByte(packet.TTL)
	_ = buffer.WriteByte(packet.HopCount)

	// Reserved for future protocol versions.
	_ = binary.Write(
		&buffer,
		byteOrder,
		uint16(0),
	)

	// Coordinates are stored as signed microdegrees.
	var latitude int32
	var longitude int32

	if packet.HasLocation() {
		latitude = int32(
			math.Round(*packet.Latitude * 1_000_000),
		)

		longitude = int32(
			math.Round(*packet.Longitude * 1_000_000),
		)
	}

	_ = binary.Write(
		&buffer,
		byteOrder,
		latitude,
	)

	_ = binary.Write(
		&buffer,
		byteOrder,
		longitude,
	)

	// Payload length
	_ = binary.Write(
		&buffer,
		byteOrder,
		uint16(len(packet.Payload)),
	)

	// Payload
	_, _ = buffer.Write(packet.Payload)

	// Authentication tag.
	//
	// It is currently zero-filled because key management
	// has not been implemented yet. The field exists now
	// so the wire format does not need to change later.
	_, _ = buffer.Write(packet.AuthTag[:])

	result := buffer.Bytes()

	if len(result) > MaxPacketSize {
		return nil, fmt.Errorf(
			"encoded packet size %d exceeds maximum %d",
			len(result),
			MaxPacketSize,
		)
	}

	return result, nil
}

func Decode(data []byte) (Packet, error) {
	if len(data) < HeaderSize+AuthTagSize {
		return Packet{}, fmt.Errorf(
			"packet too small: %d bytes",
			len(data),
		)
	}

	if len(data) > MaxPacketSize {
		return Packet{}, fmt.Errorf(
			"packet too large: %d bytes",
			len(data),
		)
	}

	reader := bytes.NewReader(data)

	var magic uint16

	if err := binary.Read(
		reader,
		byteOrder,
		&magic,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read magic: %w",
			err,
		)
	}

	if magic != ProtocolMagic {
		return Packet{}, fmt.Errorf(
			"invalid protocol magic: 0x%04X",
			magic,
		)
	}

	version, err := reader.ReadByte()
	if err != nil {
		return Packet{}, fmt.Errorf(
			"read version: %w",
			err,
		)
	}

	if version != ProtocolVersion {
		return Packet{}, fmt.Errorf(
			"unsupported protocol version: %d",
			version,
		)
	}

	headerSize, err := reader.ReadByte()
	if err != nil {
		return Packet{}, fmt.Errorf(
			"read header size: %w",
			err,
		)
	}

	if int(headerSize) != HeaderSize {
		return Packet{}, fmt.Errorf(
			"unsupported header size: %d",
			headerSize,
		)
	}

	var packet Packet

	if err := binary.Read(
		reader,
		byteOrder,
		&packet.PacketID,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read packet ID: %w",
			err,
		)
	}

	if err := binary.Read(
		reader,
		byteOrder,
		&packet.SourceID,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read source ID: %w",
			err,
		)
	}

	if err := binary.Read(
		reader,
		byteOrder,
		&packet.DestinationID,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read destination ID: %w",
			err,
		)
	}

	if err := binary.Read(
		reader,
		byteOrder,
		&packet.Sequence,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read sequence: %w",
			err,
		)
	}

	if err := binary.Read(
		reader,
		byteOrder,
		&packet.Timestamp,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read timestamp: %w",
			err,
		)
	}

	packetType, err := reader.ReadByte()
	if err != nil {
		return Packet{}, fmt.Errorf(
			"read packet type: %w",
			err,
		)
	}

	packet.Type = PacketType(packetType)

	severity, err := reader.ReadByte()
	if err != nil {
		return Packet{}, fmt.Errorf(
			"read severity: %w",
			err,
		)
	}

	packet.Severity = Severity(severity)

	var flags uint16

	if err := binary.Read(
		reader,
		byteOrder,
		&flags,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read flags: %w",
			err,
		)
	}

	packet.Flags = Flags(flags)

	packet.TTL, err = reader.ReadByte()
	if err != nil {
		return Packet{}, fmt.Errorf(
			"read TTL: %w",
			err,
		)
	}

	packet.HopCount, err = reader.ReadByte()
	if err != nil {
		return Packet{}, fmt.Errorf(
			"read hop count: %w",
			err,
		)
	}

	// Reserved field.
	var reserved uint16

	if err := binary.Read(
		reader,
		byteOrder,
		&reserved,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read reserved field: %w",
			err,
		)
	}

	_ = reserved

	var latitude int32
	var longitude int32

	if err := binary.Read(
		reader,
		byteOrder,
		&latitude,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read latitude: %w",
			err,
		)
	}

	if err := binary.Read(
		reader,
		byteOrder,
		&longitude,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read longitude: %w",
			err,
		)
	}

	var payloadLength uint16

	if err := binary.Read(
		reader,
		byteOrder,
		&payloadLength,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read payload length: %w",
			err,
		)
	}

	if int(payloadLength) > MaxPayloadSize {
		return Packet{}, fmt.Errorf(
			"payload length %d exceeds maximum %d",
			payloadLength,
			MaxPayloadSize,
		)
	}

	packet.Payload = make(
		[]byte,
		payloadLength,
	)

	if _, err := reader.Read(
		packet.Payload,
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read payload: %w",
			err,
		)
	}

	if _, err := reader.Read(
		packet.AuthTag[:],
	); err != nil {
		return Packet{}, fmt.Errorf(
			"read authentication tag: %w",
			err,
		)
	}

	if packet.Flags&FlagHasLocation != 0 {
		lat := float64(latitude) / 1_000_000
		lon := float64(longitude) / 1_000_000

		packet.Latitude = &lat
		packet.Longitude = &lon
	}

	if err := packet.Validate(); err != nil {
		return Packet{}, fmt.Errorf(
			"decoded packet validation failed: %w",
			err,
		)
	}

	return packet, nil
}
