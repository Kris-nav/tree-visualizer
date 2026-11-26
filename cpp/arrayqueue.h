// A simple practice version of the Queue used on the breadth-first slide
class Queue {
public:
    virtual void enqueue(node* n) = 0;
    virtual node* dequeue() = 0;
    virtual bool isEmpty() = 0;
    virtual ~Queue() {}
};

class ArrayQueue : public Queue {
public:
    node* items[100];
    int head = 0;   // position of the front node
    int tail = 0;   // position where the next node will go

    void enqueue(node* n) override {
        if (tail == 100) {
            throw length_error("Queue is full");
        }
        items[tail++] = n;
    }
    node* dequeue() override {
        if (isEmpty()) {
            throw length_error("Queue is empty");
        }
        return items[head++];
    }
    bool isEmpty() override {
        return head == tail;
    }
};