"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

export default function PrivacyPolicyPage() {
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate sections on scroll
    for (const element of gsap.utils.toArray('.animate-on-scroll')) {
      gsap.fromTo(element as HTMLElement,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: element as HTMLElement,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }

    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    return () => {
      for (const trigger of ScrollTrigger.getAll()) {
        trigger.kill();
      }
    };
  }, []);

  return (
    <>


      {/* Header Section */}
      <header className="bg-white pt-32 pb-16 border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-red-600 font-bold tracking-wide uppercase text-sm mb-3">Data Protection</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">We value your trust and are committed to protecting your personal information.</p>
          <div className="mt-6 inline-block bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-500">
            <i className="far fa-clock mr-2"></i>Updated on: <span className="font-semibold text-gray-700">27th November, 2025</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <main ref={mainContentRef} className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 prose">
          
          <section className="animate-on-scroll">
            <h2>Introduction</h2>
            <p>This Privacy Policy describes how MyQuro (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, stores, and protects your information when you access or use the MyQuro Platform, including the website, digital menu system, restaurant dashboards, ordering tools, reservation system, and related services.</p>
            <p>By accessing or using the Platform, you agree to the terms of this Privacy Policy. If you do not agree, please discontinue use of the Platform immediately.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section className="animate-on-scroll">
            <h2>Information We Collect</h2>
            <p>We may collect the following types of information when you use the Platform:</p>
            
            <h3>Personal Information Provided by Users</h3>
            <ul>
              <li>Full name</li>
              <li>Phone number</li>
              <li>Email address</li>
              <li>Profile/account information</li>
              <li>Table/booking details</li>
              <li>Order history and preferences</li>
            </ul>

            <h3>Automatically Collected Information</h3>
            <ul>
              <li>Device details (model, OS, browser)</li>
              <li>IP address</li>
              <li>Cookies and tracking identifiers</li>
              <li>Date/time of access</li>
              <li>Platform usage analytics</li>
            </ul>

            <h3>Payment Information</h3>
            <p>We receive payment status for your transactions but we do NOT store or collect complete payment credentials, such as:</p>
            <ul>
              <li>Card numbers</li>
              <li>CVV/PIN</li>
              <li>UPI ID</li>
              <li>Net banking passwords</li>
            </ul>
            <p>Online payments are securely processed by Cashfree Payments or other integrated payment providers.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section className="animate-on-scroll">
            <h2>How We Use Your Information</h2>
            <p>We use collected information for purposes including but not limited to:</p>
            <ul>
              <li>Account creation and login authentication</li>
              <li>Processing and managing food orders and reservations</li>
              <li>Communication with users and restaurant partners</li>
              <li>Payment confirmation and billing</li>
              <li>Improving the performance and user experience of the Platform</li>
              <li>Security monitoring, fraud prevention, and dispute resolution</li>
            </ul>
          </section>

          <hr className="my-8 border-gray-100" />

          <section className="animate-on-scroll">
            <h2>Sharing of Information</h2>
            <p>We do not sell or rent your personal information. However, we may share data with trusted third parties only as needed to operate the Platform:</p>
            <ul>
              <li><strong>Restaurant Partners:</strong> to fulfill orders and reservations</li>
              <li><strong>Cashfree Payments:</strong> to process payments, refunds, and settlements</li>
              <li><strong>SMS/Email OTP providers:</strong> for authentication and notifications</li>
              <li><strong>Government/legal authorities:</strong> only if required by law</li>
            </ul>
          </section>

          <hr className="my-8 border-gray-100" />

          <section className="animate-on-scroll">
            <h2>Data Storage &amp; Security</h2>
            <p>We take reasonable measures to protect your information from unauthorized access or misuse. Security practices include:</p>
            <ul>
              <li>Encrypted transmission of sensitive information</li>
              <li>Restricted access to user data</li>
              <li>Secured servers and authentication protocols</li>
            </ul>
            <p>While we follow industry‑standard practices, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute protection.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section className="animate-on-scroll">
            <h2>Data Retention</h2>
            <p>We retain user information for as long as necessary to:</p>
            <ul>
              <li>Provide platform services</li>
              <li>Comply with legal, taxation, and accounting requirements</li>
              <li>Support dispute resolution</li>
            </ul>
            <p>Users may request deletion of their account by contacting us using the information below. Some data may be retained for regulatory compliance.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section className="animate-on-scroll">
            <h2>Third‑Party Links</h2>
            <p>The Platform may contain links to third‑party websites or services. We are not responsible for the privacy practices or content of those external services and advise users to review their policies independently.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section className="animate-on-scroll">
            <h2>Changes to This Privacy Policy</h2>
            <p>We may update or modify this Privacy Policy at any time. Updates will be indicated by a revised &quot;Updated on&quot; date. Continued use of the Platform after any change constitutes acceptance of the revised Policy.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section className="animate-on-scroll">
            <h2>Contact Information</h2>
            <p>If you have questions, requests, or concerns regarding this Privacy Policy, you may contact us at:</p>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mt-4">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-4">
                  <i className="fas fa-envelope"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Us</p>
                  <a href="mailto:info.myquro@gmail.com" className="text-gray-900 font-semibold hover:text-red-600">info.myquro@gmail.com</a>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-4">
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-gray-900 font-semibold">To Be Updated Later</p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-sm text-gray-500">We will respond within a reasonable timeframe. Thank you for trusting MyQuro.</p>
          </section>

        </main>
      </div>

      <footer className="bg-gray-50 py-8 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">&copy; 2025 MyQuro. All rights reserved.</p>
        </div>
        <div className="flex gap-2 container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <a href="/terms" className="absolute bottom-4 right-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">Terms of Service</a>
        <a href="/privacy" className="absolute bottom-4 right-34 text-sm text-gray-400 hover:text-gray-600 transition-colors">Privacy Policy</a>
        <a href="/contact" className="absolute bottom-4 right-58 text-sm text-gray-400 hover:text-gray-600 transition-colors">Contact Us</a>
        </div>
      </footer>

    </>
  );
}