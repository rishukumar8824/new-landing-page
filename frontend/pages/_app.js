import Head from "next/head";
import "../styles/globals.css";
import { Toaster } from "react-hot-toast";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="stylesheet" href="/app.css" />
      </Head>
      <Toaster position="top-center" />
      <Component {...pageProps} />
    </>
  );
}
