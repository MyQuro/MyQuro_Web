"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

export default function TermsAndConditionsPage() {
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate sections on scroll
    gsap.utils.toArray('.animate-on-scroll').forEach((element) => {
      const el = element as HTMLElement;
      gsap.fromTo(el,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <>
      {/* Header Section */}
      <header className="bg-white pt-32 pb-16 border-b border-gray-200 relative overflow-hidden">
        {/* Hexagonal Background Layer */}
        <div className="hero-bg-pattern">
          <div className="hex-grid"></div>
          {/* Accent Hexagon 1 */}
          <svg className="hex-accent -top-5 -right-5 w-[200px] h-[230px]" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 0.5 L99.5 29.5 V85.5 L50 114.5 L0.5 85.5 V29.5 L50 0.5 Z" stroke="#9CA3AF" strokeWidth="0.5"/>
          </svg>
          {/* Accent Hexagon 2 */}
          <svg className="hex-accent bottom-[10%] -left-10 w-[150px] h-[170px]" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 0.5 L99.5 29.5 V85.5 L50 114.5 L0.5 85.5 V29.5 L50 0.5 Z" stroke="#D32F2F" strokeWidth="0.5"/>
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-red-600 font-bold tracking-wide uppercase text-sm mb-3">Legal Information</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Terms & Conditions</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">Please read these terms carefully before using our platform. They contain important information regarding your legal rights and obligations.</p>
          <div className="mt-6 inline-block bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-500">
            <i className="far fa-clock mr-2"></i>Last Updated: <span className="font-semibold text-gray-700">November 27, 2025</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <main ref={mainContentRef} className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 prose max-w-none">
          
          <section id="general" className="animate-on-scroll">
            <h2>General Terms</h2>
            <p>By accessing and placing an order with MyQuro, you confirm that you are in agreement with and bound by the terms of service contained in the Terms & Conditions outlined below. These terms apply to the entire website and any email or other type of communication between you and MyQuro.</p>
            <p>Under no circumstances shall MyQuro team be liable for any direct, indirect, special, incidental or consequential damages, including, but not limited to, loss of data or profit, arising out of the use, or the inability to use, the materials on this site, even if the MyQuro team or an authorized representative has been advised of the possibility of such damages. If your use of materials from this site results in the need for servicing, repair or correction of equipment or data, you assume any costs thereof.</p>
            <p>MyQuro will not be responsible for any outcome that may occur during the course of usage of our resources. We reserve the rights to change prices and revise the resources usage policy at any moment.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section id="license" className="animate-on-scroll">
            <h2>License</h2>
            <p>MyQuro grants you a revocable, non‑exclusive, non‑transferable, limited license to the MyQuro Platform strictly in accordance with the terms of this Agreement.</p>
            <p>These Terms & Conditions are a contract between you and MyQuro (referred to in these Terms & Conditions as "Company", "us", "we", or "our"), the provider of the MyQuro website and the services accessible from the myquro.com website (which are collectively referred to in these Terms & Conditions as the "MyQuro Service").</p>
            <p>You are agreeing to be bound by these Terms & Conditions. If you do not agree to these Terms & Conditions, please do not use the MyQuro Service. In these Terms & Conditions, "you" refers both to you as an individual and to the entity you represent. If you violate any of these Terms & Conditions, we reserve the right to cancel your account or block access to your account without notice.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section id="definitions" className="animate-on-scroll">
            <h2>Definitions and Key Terms</h2>
            <p>To help explain things as clearly as possible in this Terms & Conditions, every time any of these terms are referenced, they are strictly defined as:</p>
            <ul className="space-y-2">
              <li><strong>Cookie:</strong> small amount of data generated by a website and saved by your web browser. It is used to identify your browser, provide analytics, remember information about you such as your language preference or login information.</li>
              <li><strong>Company / We / Us / Our:</strong> Refers to MyQuro, the business responsible for providing and managing the MyQuro platform and ensuring compliance with these Terms & Conditions.</li>
              <li><strong>Platform / Service:</strong> Refers to the MyQuro website, application, dashboards, menus, ordering system, reservation system, and all technology features offered to customers and restaurant partners.</li>
              <li><strong>Customer / User / You:</strong> Refers to any individual or entity accessing or using the MyQuro platform to browse menus, place orders, make reservations, or use any related service.</li>
              <li><strong>Restaurant Partner / Merchant / Vendor:</strong> Refers to a restaurant, café, or food business listed on the MyQuro platform that accepts and fulfills customer orders.</li>
              <li><strong>Order:</strong> A food or beverage purchase request placed by a customer through the MyQuro platform.</li>
              <li><strong>Reservation:</strong> A table booking request made by a customer through the MyQuro platform for a specific date, time, and number of guests.</li>
              <li><strong>Payment Gateway:</strong> Refers to Cashfree or any integrated payment provider that processes digital payments, settlements, refunds, and chargebacks through the MyQuro platform.</li>
              <li><strong>Settlement:</strong> The transfer of customer payments from the payment gateway to the restaurant partner after successful order completion.</li>
              <li><strong>Chargeback:</strong> A payment dispute initiated by a customer through their bank or UPI app that may result in the reversal of funds.</li>
              <li><strong>Dispute:</strong> Any complaint raised by a customer or restaurant related to an order, refund, chargeback, reservation, or payment.</li>
            </ul>
          </section>

          <hr className="my-8 border-gray-100" />

          <section id="restrictions" className="animate-on-scroll">
            <h2>Restrictions</h2>
            <p>You agree that you will not, and you will not permit others to:</p>
            <ul>
              <li>Modify, copy, distribute, transmit, reproduce, publish, license, sell, or resell any part of the MyQuro Platform or its content.</li>
              <li>Use the MyQuro Platform for any illegal, unauthorized, or fraudulent activity.</li>
              <li>Attempt to gain unauthorized access to the platform, its servers, databases, user information, or security systems.</li>
              <li>Use the platform to generate fake orders, reservations, feedback, or payment disputes.</li>
              <li>Reverse-engineer, decompile, disassemble, or exploit any part of the source code or software architecture of MyQuro.</li>
              <li>Interfere with or disrupt the functionality of the platform through malware, bots, scraping, or automated scripts.</li>
              <li>Use the platform to advertise or promote competing businesses without written consent from MyQuro.</li>
              <li>Upload or transmit any material that is defamatory, abusive, threatening, obscene, misleading, or harmful to users, restaurants, staff, or the MyQuro brand.</li>
              <li>Circumvent the platform to conduct off-platform transactions directly with restaurants with the intention of avoiding platform fees or settlements.</li>
              <li>Impersonate another person, business, restaurant, or MyQuro representative.</li>
            </ul>
          </section>

          <hr className="my-8 border-gray-100" />

          <section id="payments" className="animate-on-scroll">
            <h2>Payments</h2>
            <p>If you place an order, reservation, or make any payment through the MyQuro Platform, you agree to pay all applicable charges and fees in accordance with the prices, charges, billing terms, and taxes displayed at the time the transaction is made.</p>
            <p>Unless otherwise stated in an order confirmation, you agree to provide MyQuro's Payment Provider (Cashfree Payments) with valid UPI / Debit Card / Credit Card / Net Banking information as a condition to processing your order. Your agreement with the Payment Provider governs your use of the selected payment method and you must refer to that agreement — not these Terms — to determine your rights and liabilities with respect to the Payment Provider.</p>
            <p>By providing payment information, you authorize Cashfree Payments, on behalf of MyQuro, to verify information immediately and subsequently charge your account for all payments due and payable to the relevant Restaurant Partner without additional notice or consent. You agree to immediately notify MyQuro of any change in your billing details or payment method used for transactions on the Platform.</p>
            <p>MyQuro reserves the right, at any time, to modify its pricing, convenience fees, subscription fees, or billing methods, either immediately upon posting on the Platform or by email notification.</p>
            <p>Any attorney fees, court costs, or other costs incurred in the collection of outstanding, undisputed amounts shall be your responsibility and paid by you.</p>
            <p>No contract for food or services will exist between you and the Restaurant Partner until the Restaurant Partner accepts your order through confirmation via SMS/MMS message, email, in-app notification, or other appropriate means of communication. MyQuro acts only as an intermediary facilitating the transaction and does not become a contractual party to the sale of food or beverages.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section id="marketplace" className="animate-on-scroll">
            <h2>Marketplace Role & Limitation of Liability</h2>
            <p>MyQuro is a digital marketplace and intermediary facilitating customer orders and payment processing between customers and Restaurant Partners. MyQuro does not manufacture, cook, package, or deliver food, and does not own, operate, or manage any restaurant listed on the platform.</p>
            <p>All products, services, food quality, pricing, taxes (including GST), hygiene standards, delivery timelines, and customer service are the sole responsibility of the Restaurant Partner fulfilling the order.</p>
            <p>MyQuro shall not be held liable for:</p>
            <ul>
              <li>Food taste, quality, hygiene, or safety;</li>
              <li>Delays or failure in order preparation or reservation fulfillment;</li>
              <li>Incorrect pricing, discounts, or billing;</li>
              <li>Health concerns, allergies, or food reactions;</li>
              <li>Customer service interactions or conduct of restaurant staff.</li>
            </ul>
            <p>By using the MyQuro Platform, you acknowledge and agree that the contract of sale exists only between you and the Restaurant Partner, and MyQuro acts solely as a service provider enabling discovery, ordering, reservations, and payments.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section id="responsibilities" className="animate-on-scroll">
            <h2>Restaurant Partner Responsibilities</h2>
            <p>Restaurant Partners listed on the MyQuro Platform agree to the following obligations:</p>
            <ul>
              <li>Ensure that all food and beverages served meet required hygiene and safety standards as per applicable food laws, including FSSAI regulations.</li>
              <li>Maintain accurate menu information including item names, prices, availability, allergen details, and taxes (including GST).</li>
              <li>Fulfill customer orders in a timely and professional manner and provide courteous service to customers.</li>
              <li>Accept full responsibility for food quality, preparation time, packaging, temperature, delivery/pick-up coordination (where applicable), and presentation.</li>
              <li>Handle customer disputes directly related to food quality, quantity, hygiene, taste, delivery delays, missing items, or service-related issues.</li>
              <li>Honor and execute offers, discounts, or promotional benefits published by the Restaurant Partner on the MyQuro platform.</li>
              <li>Ensure that invoices/bills generated comply with applicable taxation laws and reflect accurate order details.</li>
              <li>Maintain valid business licenses, FSSAI certification, GST registration, and any other legal permits necessary to operate.</li>
              <li>Not engage in fraudulent activity, including but not limited to canceling accepted orders without valid reason, altering pricing after order acceptance, or creating fake orders.</li>
              <li>Avoid attempting to redirect customers to off-platform transactions or competing platforms for the purpose of bypassing MyQuro systems, fees, or settlements.</li>
              <li>Cooperate with MyQuro and/or Cashfree during settlement reviews, refund processes, or chargeback disputes by providing required documentation on time.</li>
              <li>Refrain from abusive, defamatory, or inappropriate communication toward customers, MyQuro staff, or partners.</li>
            </ul>
            <p>Failure to comply with any of the above may result in temporary suspension or permanent removal of the Restaurant Partner from the MyQuro Platform, withholding of settlements, legal action, or recovery of damages where applicable.</p>

            <h3>User Responsibilities</h3>
            <p>By accessing or using the MyQuro Platform, you agree to:</p>
            <ul>
              <li>Provide accurate and complete information when creating an account or placing an order.</li>
              <li>Ensure that your contact details (phone number, email, table number, etc.) are correct for communication and order confirmation.</li>
              <li>Use the platform only for lawful purposes and not for fraudulent or unauthorized activities.</li>
              <li>Pay for all completed orders using valid and authorized payment methods.</li>
              <li>Refrain from placing test orders, fake orders, prank reservations, or intentionally misleading communications with Restaurant Partners.</li>
              <li>Respect restaurant staff and service providers and not engage in abusive, threatening, defamatory, or inappropriate behavior.</li>
              <li>Not create multiple accounts for the purpose of benefits abuse, coupons exploitation, chargeback abuse, or evading bans.</li>
              <li>Not misuse the refund or cancellation system to obtain free food, discounts, or compensation without legitimate cause.</li>
              <li>Maintain the confidentiality of your account credentials and accept responsibility for all actions conducted through your account.</li>
              <li>Immediately notify MyQuro of any unauthorized activity or security breach related to your account.</li>
            </ul>
          </section>

          <hr className="my-8 border-gray-100" />

          <section id="disputes" className="animate-on-scroll">
            <h2>Chargebacks & Disputes</h2>
            <p>In the event that a customer files a payment dispute or chargeback with their bank, UPI application, or payment provider, the following terms shall apply:</p>
            <ul>
              <li>All settlements to the Restaurant Partner related to the disputed transaction will be paused until the dispute is resolved by the payment provider.</li>
              <li>The Restaurant Partner must respond promptly to requests for documentation, including invoices, order details, proof of fulfillment, communication logs, and any other relevant evidence.</li>
              <li>Failure of the Restaurant Partner to provide valid evidence within the required timeframe may result in the settlement being reversed in favor of the customer.</li>
              <li>MyQuro and the Payment Provider reserve the right to determine whether evidence submitted is sufficient for resolving the dispute.</li>
            </ul>
            
            <h3>Customers agree that:</h3>
            <ul>
              <li>Chargebacks initiated without a legitimate basis, repeated unwarranted disputes, or misuse of the refund/chargeback process may result in suspension or permanent termination of their MyQuro account.</li>
              <li>Payment disputes should be initiated only after attempting to resolve issues directly with the Restaurant Partner through the in-app support or helpline.</li>
            </ul>

            <h3>Restaurants agree that:</h3>
            <ul>
              <li>Quality of food, preparation, speed, service, packaging, and hygiene are solely their responsibility, and chargebacks resulting from these factors do not shift liability to MyQuro.</li>
              <li>Any settlement reversal due to proven service failure, non-delivery, or incomplete order will be deducted from their payouts.</li>
            </ul>
            <p>MyQuro does not guarantee that any dispute or chargeback will be resolved in favor of the Customer or the Restaurant Partner. All resolutions are subject to payment provider rules, applicable banking laws, regulatory guidelines, and compliance requirements.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section id="legal" className="animate-on-scroll">
            <h2>Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, MyQuro shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or other intangible losses arising out of your access to or use of the Platform. Your sole and exclusive remedy for dissatisfaction with the Platform is to stop using the Platform.</p>

            <h2>Changes to Terms & Conditions</h2>
            <p>We may update, modify, or replace any part of these Terms & Conditions at any time without prior notice. Updates will be posted on the Platform with the "Last Updated" date. Continued use of the Platform after changes constitutes acceptance of the revised Terms.</p>

            <h2>Governing Law</h2>
            <p>These Terms & Conditions shall be governed and interpreted in accordance with the laws of India, and any disputes shall be subject to the exclusive jurisdiction of the courts located in Bokaro Steel City, Jharkhand.</p>

            <h2>Termination</h2>
            <p>We reserve the right, without notice or liability, to suspend or terminate user access to the Platform for any conduct that we believe violates these Terms & Conditions, applicable law, or is harmful to MyQuro, restaurant partners, or other users.</p>

            <h2>Severability</h2>
            <p>If any provision of these Terms & Conditions is held to be invalid or unenforceable, the remaining provisions will continue in full force and effect. An invalid provision will be replaced by a valid one that best matches the intent of the original.</p>
          </section>

          <hr className="my-8 border-gray-100" />

          <section id="contact" className="animate-on-scroll">
            <h2>Contact Information</h2>
            <p>If you have questions or concerns about these Terms & Conditions, you may contact us at:</p>
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
                  <i className="fas fa-building"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Company</p>
                  <p className="text-gray-900 font-semibold">MyQuro</p>
                </div>
              </div>
            </div>
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

      <style jsx>{`
        @keyframes overlayFadeOut {
          0% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; }
        }
        @keyframes crazyLetterReveal {
          0% { opacity: 0; transform: translateY(100px) rotateX(-90deg) scale(0.5) skewX(20deg); filter: blur(20px); }
          100% { opacity: 1; transform: translateY(0) rotateX(0) scale(1) skewX(0); }
        }
        @keyframes taglineSlideUp {
          to { opacity: 1; transform: translateY(0); }
        }
        .splash-ring {
          position: absolute;
          width: clamp(300px, 80vw, 600px);
          height: clamp(300px, 80vw, 600px);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          animation: ringExpand 1.5s ease-out forwards;
          z-index: -1;
        }
        @keyframes ringExpand {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        .hero-bg-pattern {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        @media (max-width: 768px) {
          .hero-bg-pattern {
            display: none;
          }
        }
        .hex-grid {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='56' height='98' viewBox='0 0 56 98' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M28 0 L56 16.5 V49.5 L28 66 L0 49.5 V16.5 Z' fill='none' stroke='%239CA3AF' stroke-width='0.5'/%3E%3Cpath d='M28 98 L56 81.5 V48.5' fill='none' stroke='%239CA3AF' stroke-width='0.5'/%3E%3Cpath d='M0 48.5 V81.5 L28 98' fill='none' stroke='%239CA3AF' stroke-width='0.5'/%3E%3C/svg%3E");
          background-size: 56px 98px;
          opacity: 0.03;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
        }
        .hex-accent {
          position: absolute;
          opacity: 0.05;
        }
        .prose h2 {
          color: #1F1F1F;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        .prose h3 {
          color: #333;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          font-size: 1.25rem;
        }
        .prose p {
          color: #686868;
          margin-bottom: 1rem;
          line-height: 1.7;
        }
        .prose ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          color: #686868;
          margin-bottom: 1rem;
        }
        .prose li {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </>
  );
}