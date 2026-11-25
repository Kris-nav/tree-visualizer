#include <fstream>
#include <iostream>
#include "mybinarytree.h"

// Builds the starting tree without using the student's code
void prepare(MyBinaryTree* tree, bool taken) {
#if defined(TEST_ADDLEFT) || defined(TEST_ADDRIGHT)
    tree->root = tree->create_node(1, NULL);
    tree->size = 1;
#endif
#ifdef TEST_ADDRIGHT
    // Node 1 already has a left child, so only the right spot is free
    tree->root->left = tree->create_node(2, tree->root);
    tree->size++;
    if (taken) {
        tree->root->right = tree->create_node(3, tree->root);
        tree->size++;
    }
#endif
#ifdef TEST_ADDLEFT
    if (taken) {
        tree->root->left = tree->create_node(2, tree->root);
        tree->size++;
    }
#endif
}

int main(int argc, char* argv[]) {
    // Run with the word "taken" to fill the spot first
    bool taken = argc > 1 && string(argv[1]) == "taken";
    MyBinaryTree* tree = new MyBinaryTree();
    prepare(tree, taken);

    try {
#if defined(TEST_ADDLEFT)
        tree->addLeft(tree->root, taken ? 4 : 2);
#elif defined(TEST_ADDRIGHT)
        tree->addRight(tree->root, taken ? 4 : 3);
#else
        tree->addRoot(1);
#endif
    } catch (const exception& error) {
        cout << error.what() << endl;
        ofstream("cpp/thrown.txt") << error.what();
    }

    cout << "size = " << tree->size << endl;
    return 0;
}