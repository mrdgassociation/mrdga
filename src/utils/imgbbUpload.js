// src/utils/imgbbUpload.js

export const uploadToImgBB = async (file, customName = "competition_poster") => {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_IMGBB_API_KEY मिळालेली नाही! कृपया .env फाईलमध्ये API key तपासा आणि Server रीस्टार्ट करा.");
  }

  // File ला Base64 मध्ये कन्व्हर्ट करणे
  const base64Image = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // Prefix काढणे
    reader.onerror = (error) => reject(error);
  });

  const formData = new FormData();
  formData.append("image", base64Image);
  formData.append("name", `${customName}_${Date.now()}`);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (data.success) {
    return {
      url: data.data.url,
      displayUrl: data.data.display_url,
      thumbUrl: data.data.thumb?.url || data.data.url,
    };
  } else {
    throw new Error(data.error?.message || "ImgBB वर फोटो अपलोड होऊ शकला नाही.");
  }
};