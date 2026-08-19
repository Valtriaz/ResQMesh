cmake_minimum_required(VERSION 3.20)

project(resqmesh_node LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(resqmesh_node
    main.cpp
    node.cpp
    packet.cpp
    mesh.cpp
    radio.cpp
    portal.cpp
    storage.cpp
)

target_compile_options(resqmesh_node PRIVATE
    -Wall
    -Wextra
    -Wpedantic
)
