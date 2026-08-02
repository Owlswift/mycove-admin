/** Renders a base64 data URL as an image or video, detected from its MIME prefix. */
export default function MediaPreview({ dataUrl, className }: { dataUrl: string; className: string }) {
  if (dataUrl.startsWith('data:video/')) {
    return <video src={dataUrl} controls className={className} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="" className={className} />;
}
