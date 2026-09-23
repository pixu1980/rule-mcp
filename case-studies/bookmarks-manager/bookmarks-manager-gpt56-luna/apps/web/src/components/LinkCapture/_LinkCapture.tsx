/** Primary link capture field with explicit loading and error states. */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  url: z.string().trim().url("Paste a complete link, including https://"),
});
type FormValues = z.infer<typeof schema>;

interface LinkCaptureProps {
  isLoading: boolean;
  error: string | null;
  onPreview: (url: string) => Promise<void>;
}

export function LinkCapture({ isLoading, error, onPreview }: LinkCaptureProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: "" },
  });
  const fieldError = errors.url?.message ?? error;

  return (
    <form
      data-part="capture-form"
      onSubmit={handleSubmit(async ({ url }) => onPreview(url))}
      noValidate
    >
      <label data-part="capture-label" htmlFor="link-input">
        Paste a link
      </label>
      <p data-part="capture-hint" id="link-hint">
        Luma will gently fetch its title, image, and a readable preview.
      </p>
      <fieldset data-part="capture-fieldset">
        <input
          id="link-input"
          data-part="capture-input"
          type="url"
          placeholder="https://…"
          aria-describedby="link-hint link-error"
          aria-invalid={Boolean(fieldError)}
          autoComplete="url"
          {...register("url")}
        />
        <button
          data-part="capture-button"
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <span data-part="button-spinner" aria-hidden="true" /> Reading…
            </>
          ) : (
            <>
              Preview link <span aria-hidden="true">↗</span>
            </>
          )}
        </button>
      </fieldset>
      <p data-part="form-error" id="link-error" role="alert">
        {fieldError}
      </p>
    </form>
  );
}
