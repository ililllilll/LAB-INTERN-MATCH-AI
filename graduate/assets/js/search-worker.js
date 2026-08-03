"use strict";

importScripts("./search-core.js");

let engine = null;

self.addEventListener("message", function (event) {
  const message = event.data || {};
  try {
    if (message.type === "INIT") {
      engine = new self.LabMatchSearch.Engine(message.runtime);
      self.postMessage({ type: "READY", requestId: message.requestId });
      return;
    }
    if (message.type === "SEARCH") {
      if (!engine) throw new Error("SEARCH_ENGINE_NOT_INITIALIZED");
      const result = engine.search(message.query || "", message.options || {});
      self.postMessage({ type: "RESULT", requestId: message.requestId, result });
    }
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      requestId: message.requestId,
      error: String(error && error.message ? error.message : error),
    });
  }
});

