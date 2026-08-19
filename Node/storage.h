#ifndef RESQMESH_STORAGE_H
#define RESQMESH_STORAGE_H

#include <cstdint>

class NodeStorage {
public:
    explicit NodeStorage(const char* path);

    bool loadNodeId(uint64_t& nodeId);
    bool saveNodeId(uint64_t nodeId);

private:
    const char* path_;
};

#endif
