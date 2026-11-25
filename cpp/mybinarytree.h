#include <cstdlib>
#include <stdexcept>
#include <string>
#include "node.h"
using namespace std;

class MyBinaryTree {
public:
    node* root;
    int size;

    node* create_node(int e, node* parent) {
        node* n = (node*) calloc(1, sizeof(node));
        n->elem = e;
        n->parent = parent;
        return n;
    }

#if !defined(TEST_DEPTH) && !defined(TEST_HEIGHT)
    #include "student.inc"
#endif
};