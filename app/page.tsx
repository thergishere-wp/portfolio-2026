import { Cursor } from "@/components/chrome/Cursor";
import { Grain } from "@/components/chrome/Grain";
import { Room } from "@/components/chrome/Room";
import { ScrollHint } from "@/components/chrome/ScrollHint";
import { SideNav } from "@/components/chrome/SideNav";
import { Intro } from "@/components/intro/Intro";
import { Stage1 } from "@/components/stage1/Stage1";

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
      </main>
    </>
  );
}
