(function () {
  "use strict";

  const scriptUrl = document.currentScript
    ? document.currentScript.src
    : new URL("./runtime-loader.js", window.location.href).href;
  const runtimeBase = new URL("../runtime/", scriptUrl);
  const cache = new Map();

  function componentKey(filename) {
    const map = {
      "metadata.json": "metadata",
      "display-records.json": "displayRecords",
      "professor-documents.json": "professorDocuments",
      "document-dictionary.json": "documentDictionary",
      "field-registry.json": "fieldRegistry",
      "token-dictionary.json": "tokenDictionary",
      "exact-phrase-lookup.json": "exactPhraseLookup",
      "safe-spacing-lookup.json": "safeSpacingLookup",
      "global-concept-lookup.json": "globalConceptLookup",
      "global-concept-postings.json": "globalConceptPostings",
      "ambiguity-lookup.json": "ambiguityLookup",
      "abbreviation-lookup.json": "abbreviationLookup",
      "professor-name-lookup.json": "professorNameLookup",
      "filter-indexes.json": "filterIndexes",
      "taxonomy-runtime.json": "taxonomy",
      "banner-config.json": "bannerConfig",
      "scorer-config.json": "scorerConfig",
      "tier-config.json": "tierConfig",
      "recovery-config.json": "recoveryConfig",
      "dgist-professor-enrichment.json": "dgistProfessorEnrichment",
      "direct-p1r2-config.json": "directP1R2Config",
    };
    return map[filename] || filename.replace(/\.json$/, "").replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
  }

  async function fetchJson(filename) {
    if (!cache.has(filename)) {
      const promise = fetch(new URL(filename, runtimeBase), {
        cache: filename === "component-manifest.json" ? "no-cache" : "force-cache",
        credentials: "same-origin",
      }).then(async (response) => {
        if (!response.ok) throw new Error(`RUNTIME_COMPONENT_HTTP_${response.status}:${filename}`);
        return response.json();
      });
      cache.set(filename, promise);
    }
    return cache.get(filename);
  }

  async function loadFiles(filenames) {
    const values = await Promise.all(filenames.map(fetchJson));
    return Object.fromEntries(
      filenames.map((filename, index) => [componentKey(filename), values[index]])
    );
  }

  class RuntimeLoader {
    constructor() {
      this.manifestPromise = fetchJson("component-manifest.json");
      this.initialPromise = null;
      this.searchPromise = null;
    }

    async manifest() {
      return this.manifestPromise;
    }

    async loadInitial() {
      if (!this.initialPromise) {
        this.initialPromise = this.manifestPromise.then((manifest) =>
          loadFiles(manifest.initialComponents)
        );
      }
      return this.initialPromise;
    }

    async loadSearch() {
      if (!this.searchPromise) {
        this.searchPromise = Promise.all([this.loadInitial(), this.manifestPromise]).then(
          async ([initial, manifest]) => {
            const search = await loadFiles(manifest.searchComponents);
            const postings = [];
            for (let index = 0; index < manifest.postingShardCount; index += 1) {
              postings.push(search[`postings${String(index).padStart(2, "0")}`]);
              delete search[`postings${String(index).padStart(2, "0")}`];
            }
            return { ...initial, ...search, postings };
          }
        );
      }
      return this.searchPromise;
    }
  }

  window.LabMatchRuntimeLoader = Object.freeze({
    RuntimeLoader,
    runtimeBase: runtimeBase.href,
  });
})();
