export function createDrawingState() {
  let history = [];
  let undoneOps = [];

  function applyOp(op) {
    history.push(op);
    undoneOps = [];
  }

  function undoLast() {
    if (history.length === 0) return null;
    const op = history.pop();
    undoneOps.push(op);
    return op;
  }

  function redoLast() {
    if (undoneOps.length === 0) return null;
    const op = undoneOps.pop();
    history.push(op);
    return op;
  }

  function clearCanvas(userId) {
    const op = {
      opId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      type: 'clear',
      data: {},
      timestamp: Date.now()
    };
    history.push(op);
    undoneOps = [];
  }

  function getState() {
    return history.slice();
  }

  return { applyOp, undoLast, redoLast, clearCanvas, getState };
}
