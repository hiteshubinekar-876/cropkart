/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
  remotePatterns: [
    { protocol: "https", hostname: "images.unsplash.com" },
    { protocol: "https", hostname: "images.pexels.com" },
    { protocol: "https", hostname: "cdn.pixabay.com" },
    { protocol: "https", hostname: "media.istockphoto.com" },
    { protocol: "https", hostname: "plus.unsplash.com" },
    { protocol: "https", hostname: "images-eu.ssl-images-amazon.com" },
    { protocol: "https", hostname: "m.media-amazon.com" }
  ],
},

};

export default nextConfig;
