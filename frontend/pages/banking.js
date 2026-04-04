import FeaturePage from "../components/FeaturePage";

export default function BankingPage() {
  return (
    <FeaturePage
      eyebrow="Banking"
      title="Move Between Fiat And Crypto Faster"
      description="Banking keeps deposits, withdrawals, and payment rails in one cleaner flow so users can fund accounts and manage balances with less friction."
      ctaLabel="Open Banking"
      ctaHref="/market"
      points={[
        "Review supported payment channels",
        "Check deposit and withdrawal status in one place",
        "Move funds into Spot, Futures, or P2P quickly",
        "Designed for a simpler exchange-to-bank experience",
      ]}
    />
  );
}
