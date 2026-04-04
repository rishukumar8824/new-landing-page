import FeaturePage from "../components/FeaturePage";

export default function LanguagePage() {
  return (
    <FeaturePage
      eyebrow="Language"
      title="Choose Your Language"
      description="Switch your MGBX experience to the language that feels easiest for you, so trading, support, and onboarding stay simple."
      ctaLabel="Go To Home"
      ctaHref="/"
      points={[
        "English support ready",
        "Future multilingual onboarding flow",
        "Cleaner labels for mobile users",
        "Localized support experience planned",
      ]}
    />
  );
}
