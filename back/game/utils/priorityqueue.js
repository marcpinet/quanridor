class PriorityQueue {
  constructor(comparator = (a, b) => a < b) {
    this._heap = [];
    this._comparator = comparator;
  }

  enqueue(value) {
    this._heap.push(value);
    this._siftUp();
    return this.size();
  }

  dequeue() {
    const poppedValue = this._heap[0];
    const bottomValue = this._heap.pop();
    if (this.size() > 0) {
      this._heap[0] = bottomValue;
      this._siftDown();
    }
    return poppedValue;
  }

  isEmpty() {
    return this.size() === 0;
  }

  size() {
    return this._heap.length;
  }

  contains(value) {
    return this._heap.includes(value);
  }

  _siftUp() {
    let nodeIdx = this.size() - 1;
    while (
      nodeIdx > 0 &&
      this._compare(nodeIdx, Math.floor((nodeIdx - 1) / 2))
    ) {
      this._swap(nodeIdx, Math.floor((nodeIdx - 1) / 2));
      nodeIdx = Math.floor((nodeIdx - 1) / 2);
    }
  }

  _siftDown() {
    let nodeIdx = 0;
    while (
      (2 * nodeIdx + 1 < this.size() &&
        this._compare(2 * nodeIdx + 1, nodeIdx)) ||
      (2 * nodeIdx + 2 < this.size() && this._compare(2 * nodeIdx + 2, nodeIdx))
    ) {
      let greaterChildIdx =
        2 * nodeIdx + 2 < this.size() &&
        this._compare(2 * nodeIdx + 2, 2 * nodeIdx + 1)
          ? 2 * nodeIdx + 2
          : 2 * nodeIdx + 1;
      this._swap(nodeIdx, greaterChildIdx);
      nodeIdx = greaterChildIdx;
    }
  }

  _compare(i, j) {
    return this._comparator(this._heap[i], this._heap[j]);
  }

  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }
}

module.exports = PriorityQueue;
