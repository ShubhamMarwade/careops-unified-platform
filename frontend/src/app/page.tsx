'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import {
  ArrowRight, CheckCircle, BarChart3, MessageSquare,
  Calendar, FileText, Package, Shield,
  PenTool,
  BrainCircuit
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { loadFromStorage, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.workspace_id) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    }
  }, [isAuthenticated, user]);

  const features = [
    { icon: MessageSquare, title: 'Unified Inbox', desc: 'All customer communication in one place' },
    { icon: Calendar, title: 'Smart Bookings', desc: 'Automated scheduling with conflict detection' },
    { icon: FileText, title: 'Forms & Documents', desc: 'Auto-send forms after bookings' },
    { icon: Package, title: 'Inventory Tracking', desc: 'Real-time stock alerts and forecasting' },
    { icon: BarChart3, title: 'Live Dashboard', desc: 'Know what\'s happening right now' },
    { icon: Shield, title: 'Automation', desc: 'Event-based rules that work predictably' },
  ];

  return (
  <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0f1117] via-[#0d1015] to-black text-gray-200">

    {/* Background Glow */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15),transparent_60%)] pointer-events-none" />

    {/* Nav */}
    <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <span className="text-white font-semibold text-xl tracking-tight">
          CareOps
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/login")}
          className="text-gray-400 hover:text-white transition"
        >
          Sign In
        </button>

        <button
          onClick={() => router.push("/register")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition duration-300 flex items-center gap-2"
        >
          Get Started <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </nav>

    {/* Hero */}
    <section className="relative z-10 container mx-auto px-6 pt-28 pb-40 text-center">

      <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-5 py-2 mb-10 backdrop-blur">
        <CheckCircle className="w-4 h-4 text-indigo-400" />
        <span className="text-indigo-300 text-sm font-medium">
          Replace tool chaos with clarity
        </span>
      </div>

      <h1 className="text-6xl md:text-7xl font-extrabold leading-tight mb-8 max-w-5xl mx-auto tracking-tight">
        <span className="text-white">One Platform.</span>
        <br />
        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
          Complete AI Operations.
        </span>
      </h1>

      <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-14 leading-relaxed">
        Stop juggling disconnected tools. CareOps unifies leads, bookings,
        communication, forms, inventory, and reporting into one intelligent
        AI-powered command center.
      </p>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => router.push("/register")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-semibold text-lg shadow-2xl shadow-indigo-600/40 transition duration-300 flex items-center gap-3"
        >
          Start Free <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={() => router.push("/login")}
          className="bg-white/5 border border-white/10 backdrop-blur px-10 py-4 rounded-2xl text-lg hover:bg-white/10 transition"
        >
          Sign In
        </button>
      </div>
    </section>

    {/* Features */}
    <section className="relative z-10 container mx-auto px-6 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <div
            key={i}
            className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition duration-300"
          >
            <div className="w-14 h-14 bg-indigo-500/15 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500/25 transition">
              <f.icon className="w-7 h-7 text-indigo-400" />
            </div>

            <h3 className="text-white font-semibold text-xl mb-3">
              {f.title}
            </h3>

            <p className="text-gray-400 leading-relaxed">
              {f.desc}
            </p>
          </div>
          
        ))}
      </div>
    </section>

    <div className="middle z-10 container mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-8">
    <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition duration-300"
          >
            <div className="w-14 h-14 bg-indigo-500/15 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500/25 transition">
              <BrainCircuit className="w-7 h-7 text-indigo-400" />
            </div>

            <h3 className="text-white font-semibold text-xl mb-3">
              {'CareOps GPT'}
            </h3>

            <p className="text-gray-400 leading-relaxed">
              {'AI-powered automation assistant'}
            </p>
          </div>
        </div>

    {/* Footer */}
    <footer className="relative z-10 border-t border-white/10 py-10">
      <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
        © 2026 CareOps — AI-Powered Operations Platform.
      </div>
    </footer>
  </div>
);
}