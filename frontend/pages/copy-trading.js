import FeaturePage from "../components/FeaturePage";

export default function CopyTradingPage() {
  return (
    <FeaturePage
      eyebrow="Copy Trading"
      title="Follow Top Traders"
      description="Explore strategy-led trading with leaderboards, transparent stats, and a calmer way for new users to mirror experienced traders."
      ctaLabel="Explore Leaders"
      ctaHref="/market"
      points={[
        "Browse trader profiles and performance snapshots",
        "Track win rate, drawdown, and preferred pairs",
        "Allocate funds to mirror trades with one setup flow",
        "Switch back to manual Spot or Futures trading anytime",
      ]}
    />
  );
}
