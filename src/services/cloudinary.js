export const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error('Cloudinary asset upload failed');
    }
    return data.secure_url;
  } catch (err) {
    console.error(err);
    throw new Error('Failed to upload image. Please check your connection and try again.');
  }
};
