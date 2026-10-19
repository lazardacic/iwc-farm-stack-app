import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { vi } from "vitest";

import ImageInput from "./ImageInput";

const uploadImageMock = vi.fn();

vi.mock("../../api/imagesApi", () => ({
  uploadImage: (file: File) => uploadImageMock(file),
}));

const ControlledImageInput = ({ initial = "" }: { initial?: string }) => {
  const [value, setValue] = useState(initial);

  return (
    <>
      <ImageInput value={value} onChange={setValue} />
      <p>value:{value}</p>
    </>
  );
};

const makeFile = (name: string, type: string, size = 1024) =>
  new File([new Uint8Array(size)], name, { type });

const chooseFile = (file: File) => {
  fireEvent.change(screen.getByLabelText("Image file"), {
    target: { files: [file] },
  });
};

describe("ImageInput", () => {
  beforeEach(() => {
    uploadImageMock.mockReset();
  });

  it("explains that a placeholder is used when there is no image", () => {
    render(<ControlledImageInput />);

    expect(
      screen.getByText("No image yet. A placeholder image will be assigned."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload image" })).toBeInTheDocument();
  });

  it("uploads a valid image and shows the preview", async () => {
    uploadImageMock.mockResolvedValue({ url: "https://images.test/photo.png" });
    const file = makeFile("photo.png", "image/png");

    render(<ControlledImageInput />);
    chooseFile(file);

    expect(
      await screen.findByText("value:https://images.test/photo.png"),
    ).toBeInTheDocument();
    expect(uploadImageMock).toHaveBeenCalledWith(file);
    expect(screen.getByAltText("Selected destination image")).toHaveAttribute(
      "src",
      "https://images.test/photo.png",
    );
    expect(screen.getByRole("button", { name: "Replace image" })).toBeInTheDocument();
  });

  it("rejects unsupported file types without uploading", () => {
    render(<ControlledImageInput />);

    chooseFile(makeFile("animation.gif", "image/gif"));

    expect(screen.getByText("Choose a JPEG, PNG or WebP image")).toBeInTheDocument();
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("rejects files over 5 MB without uploading", () => {
    render(<ControlledImageInput />);

    chooseFile(makeFile("huge.jpg", "image/jpeg", 5 * 1024 * 1024 + 1));

    expect(screen.getByText("Image must be 5 MB or smaller")).toBeInTheDocument();
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("shows the server error when the upload fails", async () => {
    uploadImageMock.mockRejectedValue(
      new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 415,
        statusText: "",
        data: { detail: "Only JPEG, PNG and WebP images are allowed" },
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    );

    render(<ControlledImageInput />);
    chooseFile(makeFile("photo.png", "image/png"));

    expect(
      await screen.findByText("Only JPEG, PNG and WebP images are allowed"),
    ).toBeInTheDocument();
    expect(screen.getByText("value:")).toBeInTheDocument();
  });

  it("removes the current image", () => {
    render(<ControlledImageInput initial="/placeholders/lake.svg" />);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.getByText("value:")).toBeInTheDocument();
  });

  it("accepts an image URL instead of an upload", () => {
    render(<ControlledImageInput />);

    fireEvent.click(screen.getByRole("button", { name: "Use an image URL instead" }));
    fireEvent.change(screen.getByLabelText("Image URL"), {
      target: { value: "https://example.com/photo.jpg" },
    });

    expect(
      screen.getByText("value:https://example.com/photo.jpg"),
    ).toBeInTheDocument();
  });

  it("disables the upload button while uploading", async () => {
    let resolveUpload: (value: { url: string }) => void = () => {};
    uploadImageMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    render(<ControlledImageInput />);
    chooseFile(makeFile("photo.png", "image/png"));

    expect(screen.getByRole("button", { name: "Uploading..." })).toBeDisabled();

    resolveUpload({ url: "https://images.test/photo.png" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Replace image" })).toBeEnabled(),
    );
  });
});
