import type { AppProps } from 'next/app';
import Script from 'next/script';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Script
        defer
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "79b3ca9075264ca18876428411998a66"}'
        strategy="afterInteractive"
      />
    </>
  );
}
