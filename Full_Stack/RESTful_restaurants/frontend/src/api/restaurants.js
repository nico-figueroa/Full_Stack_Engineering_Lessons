import { API_ENDPOINT, apiFetch } from ".";

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

export const getRestaurants = async () => {
  const response = await apiFetch(`${API_ENDPOINT}/restaurants`);
  const result = await readResponse(response);
  return result.data;
};

export const addNewRestaurant = async (newName) => {
  const response = await apiFetch(`${API_ENDPOINT}/restaurants`, {
    method: "POST",
    body: JSON.stringify({ name: newName }),
    headers: { "Content-Type": "application/json" },
  });

  const result = await readResponse(response);
  return result.data;
};

export const deleteRestaurant = async (id) => {
  const response = await apiFetch(`${API_ENDPOINT}/restaurants/${id}`, {
    method: "DELETE",
  });
  const result = await readResponse(response, { expectJson: false });
  return result.status;
};

export const updateRestaurantName = async (id, newName) => {
  const response = await apiFetch(`${API_ENDPOINT}/restaurants/${id}`, {
    method: "PUT",
    body: JSON.stringify({ newName }),
    headers: { "Content-Type": "application/json" },
  });
  const result = await readResponse(response, { expectJson: false });
  return result.status;
};

export const starRestaurant = async (id) => {
  const response = await apiFetch(`${API_ENDPOINT}/restaurants/starred`, {
    method: "POST",
    body: JSON.stringify({ restaurantId: id }),
    headers: { "Content-Type": "application/json" },
  });
  const result = await readResponse(response);
  return { status: result.status, data: result.data };
};
