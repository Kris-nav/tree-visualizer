#include <algorithm>
#include <cstddef>
using namespace std;

struct node {
    int elem;
    node* left;
    node* right;
    node* parent;

// depth() and height() belong inside node
#if defined(TEST_DEPTH) || defined(TEST_HEIGHT)
    #include "student.inc"
#endif
};