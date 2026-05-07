import { CompactCTA } from "@/components/CompactCTA";
import { ExampleGallery } from "@/components/ExampleGallery";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HomepageStateReset } from "@/components/HomepageStateReset";
import { Hero } from "@/components/Hero";
import { ValueStrip } from "@/components/ValueStrip";

export default function Home() {
  return (
    <main>
      <Header />
      <HomepageStateReset />
      <Hero />
      <ValueStrip />
      <ExampleGallery />
      <CompactCTA />
      <Footer />
    </main>
  );
}
