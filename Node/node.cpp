#include "node.h"

#include <cstdint>
#include <iomanip>
#include <iostream>
#include <random>
#include <sstream>

namespace {

uint64_t generateNodeId()
{
    std::random_device rd;

    uint64_t high =
        static_cast<uint64_t>(rd()) << 32;

    uint64_t low =
        static_cast<uint64_t>(rd());

    uint64_t id = high | low;

    return id == 0 ? 1 : id;
}

std::string makeNodeName(uint64_t id)
{
    std::ostringstream stream;

    stream << "RSQM-"
           << std::uppercase
           << std::hex
           << std::setw(8)
           << std::setfill('0')
           << static_cast<uint32_t>(id);

    return stream.str();
}

}

ResQMeshNode::ResQMeshNode()
    : storage_("node_identity.dat")
{
}

bool ResQMeshNode::loadIdentity()
{
    uint64_t storedId = 0;

    if (!storage_.loadNodeId(storedId)) {
        return false;
    }

    nodeId_ = storedId;
    nodeName_ = makeNodeName(nodeId_);

    return true;
}

bool ResQMeshNode::generateIdentity()
{
    nodeId_ = generateNodeId();

    if (!storage_.saveNodeId(nodeId_)) {
        return false;
    }

    nodeName_ = makeNodeName(nodeId_);

    return true;
}

bool ResQMeshNode::initialize()
{
    std::cout << "ResQMesh Node initializing...\n";

    if (loadIdentity()) {
        std::cout << "Identity restored.\n";
    } else {
        std::cout << "No identity found. Generating one.\n";

        if (!generateIdentity()) {
            std::cerr
                << "Failed to save node identity.\n";

            return false;
        }
    }

    std::cout
        << "Node ID   : "
        << nodeId_
        << '\n';

    std::cout
        << "Node Name : "
        << nodeName_
        << '\n';

    return true;
}

void ResQMeshNode::run()
{
    std::cout
        << "ResQMesh Node running.\n";
}

uint64_t ResQMeshNode::nodeId() const
{
    return nodeId_;
}

const std::string& ResQMeshNode::nodeName() const
{
    return nodeName_;
}
