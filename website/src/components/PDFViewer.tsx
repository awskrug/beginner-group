import { useState } from "react";
import useResizeObserver from "@react-hook/resize-observer";
import { pdfjs, Document, Page } from "react-pdf";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const options = {
  cMapUrl: "/groups/beginners/cmaps/",
};

export default function PDFViewer({ file }: { file: File }) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();

  useResizeObserver(containerRef, (entry) =>
    setContainerWidth(entry.contentRect.width),
  );

  function onDocumentLoadSuccess({
    numPages: nextNumPages,
  }: PDFDocumentProxy): void {
    setNumPages(nextNumPages);
  }

  return (
    <div
      ref={setContainerRef}
      className="relative p-2 bg-zinc-200 rounded border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700">
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        options={options}>
        {Array.from(new Array(numPages), (_el, index) => (
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            width={containerWidth}
            className={pageNumber === index + 1 ? "block" : "hidden"}
          />
        ))}
      </Document>

      {/* Left button */}
      <div className="z-50 absolute bottom-4 left-4 md:bottom-6 md:left-6 flex items-center">
        <button
          onClick={() => setPageNumber((prev) => prev - 1)}
          disabled={pageNumber <= 1}
          className="p-1 md:p-2 bg-black/30 hover:bg-black/50 text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Right button */}
      <div className="z-50 absolute bottom-4 right-4 md:bottom-6 md:right-6 flex items-center">
        <button
          onClick={() => setPageNumber((prev) => prev + 1)}
          disabled={pageNumber >= numPages!}
          className="p-1 md:p-2 bg-black/30 hover:bg-black/50 text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
