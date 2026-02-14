/// <reference lib="webworker" />

import type { GenerationRequest } from "@/lib/types/game";
import { generateChunk } from "@/lib/world/generator";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<GenerationRequest>) => {
  const response = generateChunk(event.data);
  workerScope.postMessage(response, [
    response.data.floorCenters.buffer,
    response.data.ceilingCenters.buffer,
    response.data.wallXCenters.buffer,
    response.data.wallZCenters.buffer,
    response.data.tableData.buffer,
    response.data.chairData.buffer,
    response.data.lightData.buffer,
    response.data.officeLampData.buffer,
    response.data.colliderData.buffer,
  ]);
};

export {};
