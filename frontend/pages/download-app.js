import FeaturePage from "../components/FeaturePage";

export default function DownloadAppPage() {
  return (
    <FeaturePage
      eyebrow="Download App"
      title="Trade From Anywhere"
      description="Get the MGBX mobile experience with markets, trade execution, alerts, portfolio access, and account controls all in one place."
      ctaLabel="Register On Web"
      ctaHref="/register"
      points={[
        "Mobile-first market tracking",
        "Spot and Futures access on the go",
        "Portfolio, deposit, and login controls",
        "Simple onboarding for new users",
      ]}
    />
  );
}
