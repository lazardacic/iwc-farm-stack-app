import { useId, useRef, useState, type ChangeEvent } from "react";
import { FiImage, FiUpload } from "react-icons/fi";

import { uploadImage } from "../../api/imagesApi";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  ACCEPTED_IMAGE_TYPES,
  validateImageFile,
} from "../../utils/imageFiles";

import DestinationImage from "../destination/DestinationImage";
import Button from "../ui/Button";
import Input from "../ui/Input";

interface ImageInputProps {
  value: string;
  onChange: (value: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  error?: string;
}

const ImageInput = ({
  value,
  onChange,
  onUploadingChange,
  error,
}: ImageInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [showUrlInput, setShowUrlInput] = useState(false);

  const setUploadingState = (next: boolean) => {
    setUploading(next);
    onUploadingChange?.(next);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError(undefined);
    setUploadingState(true);

    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (uploadFailure) {
      setUploadError(
        getApiErrorMessage(uploadFailure, "Unable to upload image"),
      );
    } finally {
      setUploadingState(false);
    }
  };

  const message = uploadError ?? error;

  return (
    <div className="space-y-3" role="group" aria-labelledby={labelId}>
      <p id={labelId} className="block text-sm font-medium">
        Image
      </p>

      <div
        className="
          aspect-4/3
          w-full
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          dark:border-slate-700
          dark:bg-slate-900
        "
      >
        {value ? (
          <DestinationImage
            src={value}
            alt="Selected destination image"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <FiImage size={32} aria-hidden="true" />
            <p>No image yet. A placeholder image will be assigned.</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        aria-label="Image file"
        onChange={handleFileChange}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
        >
          <FiUpload aria-hidden="true" />
          {uploading ? "Uploading..." : value ? "Replace image" : "Upload image"}
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => {
              setUploadError(undefined);
              onChange("");
            }}
          >
            Remove
          </Button>
        )}

        <button
          type="button"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
          onClick={() => setShowUrlInput((current) => !current)}
        >
          {showUrlInput ? "Hide image URL" : "Use an image URL instead"}
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        JPEG, PNG or WebP, up to 5 MB. Saved as WebP, at most 1600 px wide or tall.
      </p>

      {showUrlInput && (
        <Input
          label="Image URL"
          placeholder="https://example.com/image.jpg"
          value={value}
          onChange={(event) => {
            setUploadError(undefined);
            onChange(event.target.value);
          }}
        />
      )}

      {message && <p className="text-sm text-red-500">{message}</p>}
    </div>
  );
};

export default ImageInput;
