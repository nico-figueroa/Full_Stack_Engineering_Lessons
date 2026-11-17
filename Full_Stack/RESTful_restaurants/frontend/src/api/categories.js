import { client } from ".";

// --- CATEGORY CRUD ---

export const getCategories = async () => {
  const response = await client.get("/categories");
  return response.data;
};

export const createCategory = async (name) => {
  const response = await client.post("/categories", { name });
  return response.data;
};

export const updateCategory = async (id, name) => {
  const response = await client.put(`/categories/${id}`, { name });
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await client.delete(`/categories/${id}`);
  return response.data;
};

// --- ASSIGNMENT ROUTES ---

export const assignRestaurantToCategory = async (categoryId, restaurantId) => {
  const response = await client.post(
    `/categories/${categoryId}/assign`,
    { restaurantId }
  );
  return response.data;
};

export const removeRestaurantFromCategory = async (categoryId, restaurantId) => {
  const response = await client.post(
    `/categories/${categoryId}/remove`,
    { restaurantId }
  );
  return response.data;
};
