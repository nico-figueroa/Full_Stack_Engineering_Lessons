import { API_ENDPOINT, apiFetch } from ".";

const BASE_API_ROUTE = `${API_ENDPOINT}/restaurants/starred`;

const readResponse = async (response, { expectJson = true } = {}) => {
  const text = await response.text();
  let data;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (response.ok && expectJson) {
        throw new Error("The server returned an unreadable response.");
      }
      data = response.ok ? text : { error: text };
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}.`);
  }

  return { data, status: response.status };
};

export const getStarredRestaurants = async () => {
  const response = await apiFetch(BASE_API_ROUTE);
  const result = await readResponse(response);
  return result.data;
};

export const unstarRestaurant = async (id) => {
  const response = await apiFetch(`${BASE_API_ROUTE}/${id}`, { method: "DELETE" });
  const result = await readResponse(response, { expectJson: false });
  return result.status;
};

export const updateComment = async (id, newComment) => {
  const response = await apiFetch(`${BASE_API_ROUTE}/${id}`, {
    method: "PUT",
    body: JSON.stringify({ newComment }),
    headers: { "Content-Type": "application/json" },
  });
  const result = await readResponse(response, { expectJson: false });
  return result.status;
};
