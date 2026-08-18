#ifndef RESQMESH_PACKET_H
#define RESQMESH_PACKET_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define RESQMESH_PROTOCOL_MAGIC       0x5251
#define RESQMESH_PROTOCOL_VERSION     1

#define RESQMESH_HEADER_SIZE          54
#define RESQMESH_AUTH_TAG_SIZE        16
#define RESQMESH_MAX_PACKET_SIZE      192
#define RESQMESH_MAX_PAYLOAD_SIZE     122

#define RESQMESH_GATEWAY_NODE_ID      0ULL
#define RESQMESH_MAX_TTL              16

typedef enum {
    RESQMESH_PACKET_EMERGENCY = 1,
    RESQMESH_PACKET_SAFE      = 2,
    RESQMESH_PACKET_ACK       = 3,
    RESQMESH_PACKET_HELLO     = 4,
    RESQMESH_PACKET_HEALTH    = 5
} resqmesh_packet_type_t;

typedef enum {
    RESQMESH_SEVERITY_LOW      = 1,
    RESQMESH_SEVERITY_MEDIUM   = 2,
    RESQMESH_SEVERITY_HIGH     = 3,
    RESQMESH_SEVERITY_CRITICAL = 4
} resqmesh_severity_t;

typedef enum {
    RESQMESH_FLAG_HAS_LOCATION        = 1 << 0,
    RESQMESH_FLAG_ENCRYPTED           = 1 << 1,
    RESQMESH_FLAG_ACK_REQUIRED        = 1 << 2,
    RESQMESH_FLAG_GATEWAY_BOUND       = 1 << 3,
    RESQMESH_FLAG_PRIORITY            = 1 << 4
} resqmesh_flags_t;

/*
 * Coordinates are stored as signed integer microdegrees:
 *
 * 19.076000 -> 19076000
 * 72.877700 -> 72877700
 *
 * If location is unavailable, the HAS_LOCATION flag is cleared.
 */
typedef struct {
    uint64_t packet_id;

    uint64_t source_node_id;
    uint64_t destination_node_id;

    uint32_t sequence;
    uint32_t timestamp;

    uint8_t type;
    uint8_t severity;

    uint16_t flags;

    uint8_t ttl;
    uint8_t hop_count;

    uint16_t reserved;

    int32_t latitude_microdegrees;
    int32_t longitude_microdegrees;

    uint16_t payload_length;

    /*
     * Payload and authentication tag are stored after
     * this fixed-size header in the wire representation.
     */
} resqmesh_packet_header_t;

#ifdef __cplusplus
}
#endif

#endif