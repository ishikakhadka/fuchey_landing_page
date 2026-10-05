import { useId, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { adminUpload } from "../../services/backend/admin";

// Reads an image's size and whether it has transparent pixels (a wearable
// layer drawn on an opaque background would cover the character).
async function inspect(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        transparent = true;
        break;
      }
    }
    return { width: img.naturalWidth, height: img.naturalHeight, transparent };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Upload button for one image. onUploaded(url, { width, height, transparent }).
function ImageUpload({ label, hint, value, folder, session, onUploaded, onClear, requireTransparency = false }) {
  const id = useId();
  const [state, setState] = useState({ busy: false, error: null, warning: null });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/webp"].includes(file.type)) {
      setState({ busy: false, error: "Use a PNG or WebP.", warning: null });
      return;
    }
    if (!folder) {
      setState({ busy: false, error: "Set the item’s id first — uploads are stored under it.", warning: null });
      return;
    }
    setState({ busy: true, error: null, warning: null });
    try {
      const info = await inspect(file);
      const { url } = await adminUpload(session, folder, file);
      onUploaded(url, info);
      setState({
        busy: false,
        error: null,
        warning:
          requireTransparency && !info.transparent
            ? "This image has no transparent pixels, so it will cover the character. Export it with a transparent background."
            : null,
      });
    } catch (error) {
      setState({ busy: false, error: error.message ?? "Upload failed.", warning: null });
    }
  };

  return (
    <div className="admin-field is-wide">
      <span className="admin-label">{label}</span>
      <div className="admin-upload">
        {value ? (
          <img src={value} alt="" className="admin-upload-thumb" />
        ) : (
          <span className="admin-upload-thumb is-empty" aria-hidden="true" />
        )}
        <label htmlFor={id} className={`ghost-button ${state.busy ? "is-busy" : ""}`}>
          <ImageUp size={15} /> {state.busy ? "Uploading…" : value ? "Replace" : "Upload"}
        </label>
        <input id={id} type="file" accept="image/png,image/webp" className="sr-only" onChange={onFile} disabled={state.busy} />
        {value && onClear && (
          <button type="button" className="icon-button" aria-label={`Remove ${label}`} onClick={onClear}>
            <Trash2 size={15} />
          </button>
        )}
      </div>
      {hint && <p className="admin-hint">{hint}</p>}
      {state.warning && <p className="admin-warn">{state.warning}</p>}
      {state.error && <p className="admin-error">{state.error}</p>}
    </div>
  );
}

export default ImageUpload;
