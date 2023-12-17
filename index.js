const express = require('express');
const { Worker, isMainThread,parentPort , workerData } = require('worker_threads');
const bodyParser = require('body-parser');

const app = express();
const port = 8000;

app.use(bodyParser.json());

function processSingle(toSort) {
  const sortedArrays = toSort.map(subArray => [...subArray].sort((a, b) => a - b));
  const timeNS = process.hrtime.bigint();
  return { sortedArrays, timeNS };
}

function processConcurrent(toSort) {
  const workerPromises = toSort.map(subArray => {
    return new Promise(resolve => {
      const worker = new Worker(__filename, {
        workerData: { subArray }
      });
      worker.on('message', resolve);
    });
  });

  return Promise.all(workerPromises);
}

if (isMainThread) {
  app.post('/process-single', (req, res) => {
    const { to_sort } = req.body;
    const { sortedArrays, timeNS } = processSingle(to_sort);
    res.json({ sortedArrays, time_ns: timeNS.toString() });
  });

  app.post('/process-concurrent', async (req, res) => {
    const { to_sort } = req.body;
    const results = await processConcurrent(to_sort);
    const timeNS = process.hrtime.bigint();
    res.json({ sortedArrays: results, time_ns: timeNS.toString() });
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
} else {
  const { subArray } = workerData;
  const sortedArray = [...subArray].sort((a, b) => a - b);
  parentPort.postMessage(sortedArray);
}
