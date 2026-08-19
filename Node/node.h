#ifndef RESQMESH_NODE_H
#define RESQMESH_NODE_H

#include <cstdint>
#include <string>

#include "storage.h"

class ResQMeshNode {
public:
	ResQMeshNode();
	bool initialize();
	void run();

	uint64_t nodeId() const;
	const std::string& nodeName() const;

private:
    uint64_t nodeId_ = 0;
    std::string nodeName_;

    NodeStorage storage_;

    bool loadIdentity();
    bool generateIdentity();
};

#endif
