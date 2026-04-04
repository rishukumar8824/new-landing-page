import FeaturePage from "../components/FeaturePage";

export default function QuickBuyPage() {
  return (
    <FeaturePage
      eyebrow="Quick Buy"
      title="Buy Crypto In A Few Taps"
      description="Quick Buy gives users a fast on-ramp into crypto with simple amount selection, instant pair selection, and a smoother beginner flow."
      ctaLabel="Start Quick Buy"
      ctaHref="/market"
      points={[
        "Choose popular coins instantly",
        "Review live price before purchase",
        "Move your purchased assets to Spot or Futures",
        "Designed for fast beginner-friendly execution",
      ]}
    />
  );
}
