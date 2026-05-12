/**
 * Small leopard cub motif — uses the closeup PNG and only renders on the
 * savanna theme AND only when the right-hand band isn't visible. At
 * `lg:` breakpoint and up, the band on the right shows the full leopard
 * hero, so we hide this mascot to avoid two leopards crowding each other.
 * Below `lg:` the band is hidden by the layout, and this mascot stands in
 * so the brand presence isn't lost.
 *
 * Visibility is controlled by CSS: this component is wrapped in a
 * `.savanna-only` span which is hidden by default and revealed only when
 * `[data-theme="savanna"]` is on `<html>`. The Tailwind `lg:hidden` rule
 * additionally hides it on wide viewports.
 */
export default function SmallLeopard({ size = 110 }: { size?: number }) {
  return (
    <span
      className="savanna-only shrink-0 leopard-peek-on-hover lg:hidden"
      style={{ width: size, height: size, lineHeight: 0 }}
      aria-hidden
    >
      <img
        src="/leopard-cub-closeup.png"
        alt=""
        aria-hidden
        width={size}
        height={size}
        className="block transition-transform duration-300"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
        }}
      />
    </span>
  );
}
