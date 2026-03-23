export async function uploadFile(
  endpoint: string,
  file: File,
  additionalFields?: Record<string, string>
): Promise<Response> {
  const formData = new FormData();
  formData.append('image', file);

  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  return fetch(endpoint, {
    method: 'POST',
    body: formData
  });
}
