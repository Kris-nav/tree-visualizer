node* addRoot(int e) {
    if (root) {
        throw logic_error("Already has root");
    }
    node* n = create_node(e, NULL);
    root = n;
    size++;
    return n;
}