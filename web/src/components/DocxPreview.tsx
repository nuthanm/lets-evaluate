"use client";

import { useEffect, useRef, useState } from "react";

type DocxPreviewProps = {
  fileUrl: string;
  filename?: string;
};

export function DocxPreview({ fileUrl, filename }: DocxPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useNativeEmbed, setUseNativeEmbed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mountNode = mountRef.current;

    async function renderDocx() {
      if (!mountNode) return;

      setLoading(true);
      setError(null);
      setUseNativeEmbed(false);
      mountNode.innerHTML = "";

      try {
        const response = await fetch(fileUrl, { credentials: "include" });
        if (!response.ok) {
          throw new Error("Unable to load resume file");
        }

        const blob = await response.blob();
        const { renderAsync } = await import("docx-preview");
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // DOCX is an OpenXML ZIP package and must start with PK signature.
        const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
        if (!isZip) {
          throw new Error("Invalid DOCX container");
        }

        if (cancelled || !mountRef.current) return;

        await renderAsync(buffer, mountRef.current, undefined, {
          className: "docx-preview-render",
          inWrapper: true,
          breakPages: true,
          // Keep the document's real table/column widths so wide tables
          // overflow their page and trigger the horizontal scrollbar below
          // instead of being silently squeezed to fit the container.
          ignoreWidth: false,
          ignoreHeight: true,
          useBase64URL: true,
        });

        if (!cancelled) {
          setLoading(false);
        }
      } catch {
        if (cancelled) return;
        // Keep original-file read-only mode by letting the browser try native embed.
        setUseNativeEmbed(true);
        setError("Renderer failed; switched to native read-only document view.");
        setLoading(false);
      }
    }

    void renderDocx();

    return () => {
      cancelled = true;
      if (mountNode) mountNode.innerHTML = "";
    };
  }, [fileUrl]);

  return (
    <div className="docx-preview-host relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f3f4f6] p-4">
      {useNativeEmbed ? (
        <iframe
          src={fileUrl}
          title={filename ? `${filename} preview` : "Document preview"}
          className="h-full w-full overflow-hidden rounded-lg border border-[var(--cream-2)] bg-white"
        />
      ) : (
        <div ref={mountRef} className="mx-auto w-full overflow-x-hidden" />
      )}

      {loading && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/70 text-sm font-semibold text-[var(--ink-soft)]">
          Rendering document preview...
        </div>
      )}

      {error && (
        <div className="absolute inset-x-4 bottom-4 rounded-xl border border-[var(--orange)] bg-[var(--orange-soft)] p-3 text-xs text-[var(--orange)]">
          {error}{" "}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline"
          >
            Open {filename ?? "resume"}
          </a>
        </div>
      )}

      <style jsx global>{`
        /*
         * renderAsync() is called with className: "docx-preview-render",
         * which overrides docx-preview's default "docx" base class. That
         * makes the real generated markup:
         *   <div class="docx-preview-render-wrapper">
         *     <section class="docx-preview-render">...page...</section>
         *   </div>
         * ".docx-wrapper" / ".docx" never match anything in this DOM.
         */
        .docx-preview-host .docx-preview-render-wrapper {
          max-width: 100% !important;
          padding: 0 !important;
        }

        /* Each rendered page scrolls its own overflow horizontally so wide
           tables get a scrollbar right under them instead of blowing out
           the whole preview's layout. The page section itself is capped to
           the container width, but its content (e.g. a table with its
           original document widths) can be wider and will scroll. */
        .docx-preview-host .docx-preview-render {
          max-width: 100% !important;
          overflow-x: auto !important;
        }

        .docx-preview-host .docx-preview-render table {
          width: max-content;
          min-width: 100%;
          table-layout: auto;
        }
      `}</style>
    </div>
  );
}
