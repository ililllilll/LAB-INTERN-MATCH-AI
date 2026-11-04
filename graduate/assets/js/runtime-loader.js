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
      "six-university-direct-index.json": "sixUniversityDirectIndex",
    };
    return map[filename] || filename.replace(/\.json$/, "").replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
  }

  // Runtime manifests are revalidated on every page load. Every data file URL
  // includes its content hash from the current manifest, preventing an old
  // cached JSON response from being mixed with a newly deployed site.
  async function fetchJson(filename, contentHash = "") {
    const cacheKey = `${filename}:${contentHash}`;
    if (!cache.has(cacheKey)) {
      const url = new URL(filename, runtimeBase);
      if (contentHash) url.searchParams.set("v", contentHash.slice(0, 16));
      const promise = fetch(url, {
        cache: filename === "component-manifest.json" ? "no-cache" : "default",
        credentials: "same-origin",
      }).then(async (response) => {
        if (!response.ok) throw new Error(`RUNTIME_COMPONENT_HTTP_${response.status}:${filename}`);
        return response.json();
      });
      cache.set(cacheKey, promise);
    }
    return cache.get(cacheKey);
  }

  async function loadFiles(filenames, manifest) {
    const hashes = new Map((manifest.components || []).map((item) => [item.path, item.sha256]));
    const values = await Promise.all(filenames.map((filename) =>
      fetchJson(filename, hashes.get(filename) || manifest.runtimeVersion || "")
    ));
    return Object.fromEntries(
      filenames.map((filename, index) => [componentKey(filename), values[index]])
    );
  }

  class RuntimeLoader {
    constructor() {
      this.manifestPromise = fetchJson("component-manifest.json");
      this.initialPromise = null;
      this.searchPromise = null;
      this.sixDirectPromise = null;
    }

    async manifest() {
      return this.manifestPromise;
    }

    async loadInitial() {
      if (!this.initialPromise) {
        this.initialPromise = this.manifestPromise.then((manifest) =>
          loadFiles(manifest.initialComponents, manifest)
        );
      }
      return this.initialPromise;
    }

    // Loaded only if the visitor selects direct research search. Browse mode
    // retains its original taxonomy and does not download this index.
    async loadSixDirect() {
      if (!this.sixDirectPromise) {
        this.sixDirectPromise = this.manifestPromise.then(async (manifest) => {
          const values = await loadFiles(["six-university-direct-index.json"], manifest);
          return values.sixUniversityDirectIndex;
        });
      }
      return this.sixDirectPromise;
    }

    async loadSearch() {
      if (!this.searchPromise) {
        this.searchPromise = Promise.all([this.loadInitial(), this.manifestPromise]).then(
          async ([initial, manifest]) => {
            const search = await loadFiles(manifest.searchComponents, manifest);
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
