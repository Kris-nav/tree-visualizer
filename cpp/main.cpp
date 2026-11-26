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
#if defined(TEST_PREORDER) || defined(TEST_INORDER) || \
    defined(TEST_POSTORDER) || defined(TEST_BREADTHFIRST)
// The sample tree from the traversal slides
int main() {
    MyBinaryTree* tree = new MyBinaryTree();
    node* all[8] = {NULL};
    all[1] = tree->root = tree->create_node(1, NULL);
    tree->size = 1;
    auto add = [&](int parent, bool onLeft, int e) {
        all[e] = tree->create_node(e, all[parent]);
        (onLeft ? all[parent]->left : all[parent]->right) = all[e];
        tree->size++;
    };
    add(1, true, 2);
    add(1, false, 3);
    add(2, true, 4);
    add(2, false, 5);
    add(3, false, 6);
    add(5, true, 7);

    // Send what the student prints to a file, one piece at a time
    ofstream output("cpp/output.txt");
    streambuf* screen = cout.rdbuf(output.rdbuf());
    cout << unitbuf;
#if defined(TEST_PREORDER)
    tree->preorder();
#elif defined(TEST_INORDER)
    tree->inorder();
#elif defined(TEST_POSTORDER)
    tree->postorder();
#else
    tree->breadthfirst();
#endif
    cout.rdbuf(screen);
    return 0;
}
#elif defined(TEST_SIBLING)
// The tree from the sibling slide. The argument is the node to use as n.
int main(int argc, char* argv[]) {
    MyBinaryTree* tree = new MyBinaryTree();
    node* all[8] = {NULL};
    all[1] = tree->root = tree->create_node(1, NULL);
    tree->size = 1;
    auto add = [&](int parent, bool onLeft, int e) {
        all[e] = tree->create_node(e, all[parent]);
        (onLeft ? all[parent]->left : all[parent]->right) = all[e];
        tree->size++;
    };
    add(1, true, 2);
    add(1, false, 3);
    add(2, true, 4);
    add(2, false, 5);
    add(3, false, 6);
    add(5, true, 7);

    int target = argc > 1 ? stoi(argv[1]) : 4;
    if (target < 1 || target > 7) target = 4;
    node* answer = tree->sibling(all[target]);
    // 0 means NULL. The nodes are numbered 1 to 7.
    ofstream("cpp/result.txt") << (answer ? answer->elem : 0);
    return 0;
}
#elif defined(TEST_REMOVE)
// The practice trees from the remove slides. The argument is the case number.
int main(int argc, char* argv[]) {
    int choice = argc > 1 ? stoi(argv[1]) : 1;
    MyBinaryTree* tree = new MyBinaryTree();
    node* all[8] = {NULL};
    all[1] = tree->root = tree->create_node(1, NULL);
    tree->size = 1;
    auto add = [&](int parent, bool onLeft, int e) {
        all[e] = tree->create_node(e, all[parent]);
        (onLeft ? all[parent]->left : all[parent]->right) = all[e];
        tree->size++;
    };
    add(1, true, 2);
    if (choice != 3) add(1, false, 3);
    add(2, true, 4);
    add(2, false, 5);
    if (choice == 2 || choice == 4) add(3, false, 6);
    if (choice == 1 || choice == 4) add(5, true, 7);

    // Case 1, Case 2, Case 2 at the root, Case 3
    int targets[5] = {7, 7, 3, 1, 2};
    int result = tree->remove(all[targets[choice]]);
    cout << "returned " << result << endl;
    ofstream("cpp/result.txt") << result;
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
#endif