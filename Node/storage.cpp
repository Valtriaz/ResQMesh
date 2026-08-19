#include "storage.h"

#include <fstream>

NodeStorage::NodeStorage(const char* path)
    : path_(path)
{
}

bool NodeStorage::loadNodeId(uint64_t& nodeId)
{
    std::ifstream file(path_);

    if (!file.is_open()) {
        return false;
    }

    file >> nodeId;

    if (file.fail() || nodeId == 0) {
        return false;
    }

    return true;
}

bool NodeStorage::saveNodeId(uint64_t nodeId)
{
    if (nodeId == 0) {
        return false;
    }

    std::ofstream file(
        path_,
        std::ios::trunc
    );

    if (!file.is_open()) {
        return false;
    }

    file << nodeId << '\n';

    return file.good();
}
