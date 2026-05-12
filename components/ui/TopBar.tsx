/**
 * Global top bar — search input lives on the right, always available from
 * any page. Compact width so the empty left side reads as breathing room
 * (the right-hand band on the right and the sidebar on the left already carry
 * the brand presence).
 *
 * Pure presentation: posts to /search via a normal GET form, no JS required.
 */
export default function TopBar() {
  return (
    <div className="px-8 md:px-14 pt-8 md:pt-10 pb-2 flex justify-end">
      <form
        action="/search"
        method="get"
        className="flex items-center gap-2 w-full max-w-md"
      >
        <div className="flex-1 relative">
          <span
            aria-hidden
            className="absolute left-4 top-1/2 -translate-y-1/2 text-dim"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            name="q"
            placeholder="Search for anything…"
            className="w-full bg-paper border border-line rounded-full pl-11 pr-4 py-2.5 text-sm text-bright placeholder:text-dim font-sans focus:outline-none focus:border-peach focus:shadow-softer shadow-softer transition-all"
          />
        </div>
        <button
          type="submit"
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-paper transition-colors shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #7DD3A0 0%, #F4C770 100%)",
            boxShadow: "0 4px 12px -4px rgba(125, 211, 160, 0.5)",
          }}
        >
          Search
        </button>
      </form>
    </div>
  );
}
