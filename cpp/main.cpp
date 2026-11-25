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

#if defined(TEST_DEPTH) || defined(TEST_HEIGHT)
// The 6-node practice tree. The argument is the node to start from.
int main(int argc, char* argv[]) {
    MyBinaryTree* tree = new MyBinaryTree();
    node* all[7] = {NULL};
    all[1] = tree->create_node(1, NULL);
    all[2] = all[1]->left = tree->create_node(2, all[1]);
    all[3] = all[1]->right = tree->create_node(3, all[1]);
    all[4] = all[2]->left = tree->create_node(4, all[2]);
    all[5] = all[3]->right = tree->create_node(5, all[3]);
    all[6] = all[5]->right = tree->create_node(6, all[5]);
    tree->root = all[1];
    tree->size = 6;

    int target = argc > 1 ? stoi(argv[1]) : 1;
    if (target < 1 || target > 6) target = 1;
#ifdef TEST_DEPTH
    cout << "depth = " << all[target]->depth() << endl;
#else
    cout << "height = " << all[target]->height() << endl;
#endif
    return 0;
}
#else
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
#endif