import { Cursor } from "@/components/chrome/Cursor";
import { Footer } from "@/components/chrome/Footer";
import { Grain } from "@/components/chrome/Grain";
import { Room } from "@/components/chrome/Room";
import { ScrollHint } from "@/components/chrome/ScrollHint";
import { SideNav } from "@/components/chrome/SideNav";
import { Intro } from "@/components/intro/Intro";
import { Stage1 } from "@/components/stage1/Stage1";
import { Stage3 } from "@/components/stage3/Stage3";

export default function Home() {
  return (
    <>
      <Room />
      <Grain />
      <Cursor />
      <Intro />
      <ScrollHint />
      <SideNav />
      <main>
        <Stage1 />
        <Stage3 />
      </main>
      <Footer />
    </>
  );
}
