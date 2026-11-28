const DEFAULTS = {
  DAILYMED_API_BASE_URL: "https://dailymed.nlm.nih.gov/dailymed/services/v2",
  DAILYMED_WEB_BASE_URL: "https://dailymed.nlm.nih.gov/dailymed",
  RXNORM_API_BASE_URL: "https://rxnav.nlm.nih.gov/REST",
  OPENFDA_API_URL: "https://api.fda.gov/drug/label.json",
  FDA_SRS_API_URL: "https://precision.fda.gov/srs/api/v1/substances",
  NCBI_EUTILS_BASE_URL: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils",
  PUBMED_WEB_BASE_URL: "https://pubmed.ncbi.nlm.nih.gov",
  MEDLINEPLUS_CONNECT_URL: "https://connect.medlineplus.gov/service",
  NIH_ODS_DSLD_API_BASE_URL: "https://api.ods.od.nih.gov/dsld/v9",
  NIH_ODS_SUPPLEMENT_API_URL: "https://ods.od.nih.gov/api/supplement.json",
};

export function externalServiceUrl(name, path = "") {
  const configured = process.env[name]?.trim() || DEFAULTS[name];
  if (!configured) throw new Error(`Unsupported external service configuration: ${name}`);
  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${name} must use http or https`);
  }
  if (!path) return url.toString().replace(/\/$/, "");

  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  return url.toString();
}

export function publicDataRequestTimeoutMs() {
  const configured = Number(process.env.PUBLIC_DATA_REQUEST_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 8_000;
}

export function publicDataToolName() {
  const configured = process.env.PUBLIC_DATA_TOOL_NAME?.trim();
  return configured || "intakewise";
}

export function dailyMedWebUrl(path = "") {
  return externalServiceUrl("DAILYMED_WEB_BASE_URL", path);
}
