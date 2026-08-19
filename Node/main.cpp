#include "node.h"

int main()
{
    ResQMeshNode node;

    if (!node.initialize()) {
        return 1;
    }

    node.run();

    return 0;
}
