"use client";
import { useState } from "react";

import {
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarClock,
  ChevronRight,
  Compass,
  MessageCircleMore,
  Sparkles,
  TrendingUp,
  Users2,
} from "lucide-react";

const stats = [
  { label: "Applications", value: "24", change: "+6 this week", icon: BriefcaseBusiness },
  { label: "Interviews", value: "5", change: "2 upcoming", icon: CalendarClock },
  { label: "Network", value: "81", change: "+12 warm leads", icon: Users2 },
  { label: "AI Score", value: "92%", change: "strong match", icon: Sparkles },
];

const applications = [
  { company: "Northstar Labs", role: "Senior Product Designer", stage: "Interview Prep", status: "High fit" },
  { company: "Lumen AI", role: "Staff Frontend Engineer", stage: "Recruiter Screen", status: "In progress" },
  { company: "Orbit Health", role: "Senior UX Researcher", stage: "Portfolio Review", status: "Follow up" },
];

const networking = [
  { name: "Mina Chen", role: "VP Design @ Northstar", note: "Intro available this week" },
  { name: "Ari Malik", role: "Principal Engineer @ Lumen", note: "Shared a referral note" },
  { name: "Jules Rivera", role: "Talent Partner @ Orbit", note: "Suggested a portfolio refresh" },
];

const insights = [
  { title: "Resume alignment", text: "Your summary now matches 3 of your top target roles at 92%." },
  { title: "Best outreach window", text: "Tuesday mornings bring the highest response rate for recruiter messages." },
  { title: "Momentum trend", text: "Applications and referrals are up 18% compared with last month." },
];

export default function Home() {
  const [showAddApplication, setShowAddApplication] = useState(false);
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#111827_50%,_#0f172a_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur xl:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
                <Compass className="h-4 w-4" />
                Career tracking, reimagined
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Carvio</h1>
                <p className="mt-3 max-w-2xl text-lg text-slate-300">
                  Keep your search organized, your network warm, and your next opportunity closer with AI-powered clarity.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              <div className="flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4" />
                Momentum is up 18%
              </div>
              <p className="mt-1 text-emerald-100/80">Your outreach cadence is performing better than last month.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/20 backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <div className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <p className="text-3xl font-semibold">{stat.value}</p>
                  <p className="text-sm text-slate-300">{stat.change}</p>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-300">Dashboard</p>
                <h2 className="mt-2 text-2xl font-semibold">Your search pulse</h2>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                View report
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <div className="flex items-center gap-2 text-cyan-200">
                  <BarChart3 className="h-4 w-4" />
                  Weekly focus
                </div>
                <div className="mt-4 space-y-3">
                  {["Portfolio polish", "Referral asks", "Interview prep"].map((item, index) => (
                    <div key={item}>
                      <div className="mb-1 flex items-center justify-between text-sm text-slate-200">
                        <span>{item}</span>
                        <span>{[80, 65, 72][index]}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800">
                        <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${[80, 65, 72][index]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex items-center gap-2 text-violet-300">
                  <BrainCircuit className="h-4 w-4" />
                  AI insights
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {insights.slice(0, 2).map((item) => (
                    <li key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="font-medium text-slate-100">{item.title}</p>
                      <p className="mt-1 text-slate-400">{item.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-300">Job Applications</p>
                <h2 className="mt-2 text-2xl font-semibold">Active opportunities</h2>
              </div>
              <button
               onClick={() => setShowAddApplication(true)}
                className="rounded-full border border-white/10 bg-emerald-500 p-2 text-slate-200 transition hover:bg-white/10"
                >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {applications.map((application) => (
                <div key={application.company} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-100">{application.role}</p>
                      <p className="mt-1 text-sm text-slate-400">{application.company}</p>
                    </div>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                      {application.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{application.stage}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-fuchsia-300">Networking</p>
                <h2 className="mt-2 text-2xl font-semibold">Warm connections</h2>
              </div>
              <button className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10">
                <MessageCircleMore className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {networking.map((contact) => (
                <div key={contact.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div>
                    <p className="font-semibold text-slate-100">{contact.name}</p>
                    <p className="text-sm text-slate-400">{contact.role}</p>
                  </div>
                  <p className="max-w-[180px] text-right text-sm text-slate-300">{contact.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-300">AI Insights</p>
                <h2 className="mt-2 text-2xl font-semibold">Smart next moves</h2>
              </div>
              <div className="rounded-full border border-amber-400/20 bg-amber-400/10 p-2 text-amber-200">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {insights.map((insight) => (
                <div key={insight.title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="font-semibold text-slate-100">{insight.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}