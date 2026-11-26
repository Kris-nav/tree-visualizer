#include <cstdlib>
#include <iostream>
#include <stdexcept>
#include <string>
#include "node.h"
using namespace std;
#include "arrayqueue.h"

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

    // Helpers used by the lecture's remove(n)
    node* left(node* p) { return p->left; }
    node* right(node* p) { return p->right; }

#if !defined(TEST_DEPTH) && !defined(TEST_HEIGHT)
    #include "student.inc"
#endif
};