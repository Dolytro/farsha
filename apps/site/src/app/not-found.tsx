import type { Metadata } from "next";
import { ContentPage } from "../components/content/ContentPage";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <ContentPage path="/404" title="Page not found">
      <h1>Page not found</h1>
      <p className="content-page__lead">That page does not exist. Try the <a href="/">home page</a>, the <a href="/features">features</a>, or open the <a href="/app">editor</a>.</p>
    </ContentPage>
  );
}
