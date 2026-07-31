"use client";
import React, { JSX } from "react";
import Footer from "../../components/Footer";
import Explore from "../../components/explore";

export default function ExplorePage(): JSX.Element {
  return (
    <>
      <main className="min-h-screen bg-black overflow-hidden flex flex-col font-sans">
        <Explore />
      </main>

      <Footer />
    </>
  );
}