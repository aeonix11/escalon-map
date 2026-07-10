"use client";

interface CommentPinProps {
  authorName: string;
  isFocused: boolean;
  isPreview?: boolean;
  onClick?: () => void;
}

export default function CommentPin({
  authorName,
  isFocused,
  isPreview = false,
  onClick,
}: CommentPinProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={authorName}
      className={`flex items-center justify-center rounded-full border-2 shadow-sm transition-all ${
        isPreview
          ? "h-7 w-7 border-dashed border-sky-400 bg-sky-50 text-sky-600"
          : isFocused
            ? "h-8 w-8 border-sky-600 bg-sky-500 text-white ring-2 ring-sky-300 scale-110"
            : "h-7 w-7 border-sky-400 bg-white text-sky-600 hover:bg-sky-50 hover:scale-105"
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className={isFocused ? "h-4 w-4" : "h-3.5 w-3.5"}
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
