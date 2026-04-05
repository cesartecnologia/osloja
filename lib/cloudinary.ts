export function getCloudinaryPublicConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  return {
    cloudName,
    uploadPreset,
    isConfigured: Boolean(cloudName && uploadPreset)
  };
}
