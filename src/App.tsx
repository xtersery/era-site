import { ScrollProvider } from '@/animations/scroll';
import { Footer, Header, StickyBar } from '@/components/layout';
import { InquiryProvider } from '@/lib/inquiry';
import { StageCanvas } from '@/three/components/StageCanvas';
import {
  Cases,
  Contact,
  Founder,
  Hero,
  Inquiry,
  Manifesto,
  Pricing,
  Reviews,
  Services,
  Specialists,
} from '@/sections';

/**
 * The page: ten rooms in approved order (CLAUDE.md), fixed header, phone sticky
 * bar, colophon. Providers: the scroller (Lenis / native by tier) and the
 * inquiry pre-fill.
 *
 * The stage canvas mounts once, lazily, for live tiers only, and draws nothing
 * until a set is added (per spike). Rooms stay greyscale.
 */
export default function App() {
  return (
    <ScrollProvider>
      <InquiryProvider>
        <a className="skip-link" href="#services">
          Перейти к содержанию
        </a>
        <StageCanvas />
        <Header />
        <main id="main">
          <Hero id="hero" />
          <Manifesto id="manifesto" />
          <Services id="services" />
          <Pricing id="pricing" />
          <Cases id="cases" />
          <Specialists id="specialists" />
          <Founder id="founder" />
          <Reviews id="reviews" />
          <Contact id="contact" />
          <Inquiry id="inquiry" />
        </main>
        <Footer />
        <StickyBar />
      </InquiryProvider>
    </ScrollProvider>
  );
}
