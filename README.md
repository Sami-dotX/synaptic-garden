<div align="center">

# 🧠 Synaptic Garden

**A Living Neural Ecosystem for Emergent Multi-Agent Intelligence**

*Simulate, visualize and stress-test complex systems in real time*

[![GitHub Stars](https://img.shields.io/github/stars/samsam92240-tech/synaptic-garden?style=flat-square&color=5566CC)](https://github.com/samsam92240-tech/synaptic-garden/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/samsam92240-tech/synaptic-garden?style=flat-square)](https://github.com/samsam92240-tech/synaptic-garden/network)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![PixiJS](https://img.shields.io/badge/PixiJS-7-E72264?style=flat-square)](https://pixijs.com/)

</div>

---

## ⚡ Overview

**Synaptic Garden** is a real-time multi-agent simulation platform powered by biologically-inspired neural models. Thousands of agents interact, form clusters, learn via STDP plasticity, and produce emergent collective behavior — all rendered at 60fps via WebGL.

> **You define the roles, inject a shock, and watch the system react in real time.**

Whether you're simulating financial contagion, social dynamics, epidemics, or neural networks, Synaptic Garden provides a universal agent-based framework with a fully configurable role system.

### Vision

- **For researchers**: A real-time laboratory for emergent dynamics, STDP learning, and multi-agent systems
- **For analysts**: A stress-testing sandbox — simulate market shocks, supply chain disruptions, or policy changes
- **For everyone**: An interactive, visual, and intuitive way to understand complex systems

---

## 📸 Screenshots

<div align="center">
<table>
<tr>
<td align="center"><strong>Financial Contagion — 5 market roles</strong></td>
<td align="center"><strong>Sector Index — diverging prices</strong></td>
</tr>
<tr>
<td><img src="https://via.placeholder.com/500x300/080B14/D8D6CC?text=Canvas+View" alt="Canvas" width="100%"/></td>
<td><img src="https://via.placeholder.com/500x300/0D1120/D8D6CC?text=Analytics+Panel" alt="Analytics" width="100%"/></td>
</tr>
<tr>
<td align="center"><strong>Role Editor — custom agent types</strong></td>
<td align="center"><strong>AI Assistant — Claude-powered</strong></td>
</tr>
<tr>
<td><img src="https://via.placeholder.com/500x300/0D1120/D8D6CC?text=Role+Editor" alt="Role Editor" width="100%"/></td>
<td><img src="https://via.placeholder.com/500x300/0D1120/D8D6CC?text=AI+Chat" alt="AI Chat" width="100%"/></td>
</tr>
</table>
</div>

---

## 🎯 Features

### Simulation Engine
- **Two neuron models** swappable at runtime: LIF+ (performance, 2k-5k agents) and Izhikevich (expressive firing patterns)
- **STDP synaptic plasticity** — connections strengthen or weaken based on spike timing
- **Social conformity & imitation** — agents influence each other's behavior
- **Fatigue & valence** — emotional affect layer modulates agent dynamics
- **Spatial clustering** — grid-based DBSCAN for real-time cluster detection
- **Web Worker architecture** — simulation fully decoupled from rendering

### Configurable Roles
- **Role Editor** — create, edit, delete agent roles with 10+ behavioral parameters
- **Per-role parameters**: speed, conformity, fatigue sensitivity, noise sensitivity, excitatory bias, energy recovery
- **Financial preset**: Oil Traders, Equity Funds, Algo HFT, Central Banks, Hedge Funds
- **Universal** — define any domain: epidemiology, ecology, social networks, markets

### Visualization
- **WebGL rendering** via PixiJS ParticleContainer at 60fps
- **Sector Index** — multi-line price chart derived from agent dynamics (base=100)
- **Per-role metrics** — Activity, Capital, Stress with price sparklines
- **Market Overview** — Sectors, Volatility, Disorder, Counterparties
- **Agent Inspector** — click any agent, drag the panel, see full internal state
- **Event Log** — cluster formation, leader emergence, signal waves

### AI Assistant
- **Claude API integration** — natural language interaction to configure and interpret simulations
- **Reads full simulation state** — params, metrics, per-role averages, recent events
- **Executes actions** — change parameters, load presets, inject events, modify roles
- **Multilingual** — responds in the user's language

### Scenarios & Events
- **4 presets**: Cooperative Colony, Competitive Swarm, Fragile Ecosystem, Financial Contagion
- **4 event injections**: Energy Burst, Noise Shock, Freeze All, Kill Weak Links
- **Hormuz Blockade** — scripted multi-step financial crisis scenario

---

## 🔬 Neuron Models

| Model | Agents @ 60fps | Best for | Reference |
|---|---|---|---|
| **LIF+** | 2,000 – 5,000 | Quick demos, large populations | Leaky Integrate-and-Fire |
| **Izhikevich** | 500 – 2,000 | Rich firing patterns, research | Izhikevich (2003) IEEE Trans. |

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** | 18+ | `node -v` |
| **npm** | 9+ | `npm -v` |

### Installation

```bash
# Clone the repository
git clone https://github.com/samsam92240-tech/synaptic-garden.git
cd synaptic-garden

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### AI Assistant (optional)

To enable the AI chat assistant, create a `.env` file:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

Then restart the dev server. The AI can interpret simulation results and modify parameters via natural language.

---

## 🏗️ Architecture

```
Web Worker (simulation)          React (UI)              PixiJS (rendering)
┌─────────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  SimulationEngine    │    │  Zustand Store    │    │  PixiRenderer    │
│  ├─ LIF+ / Izhikev. │───>│  tick, metrics,   │───>│  ParticleContainer│
│  ├─ STDP plasticity  │    │  events, params   │    │  Graphics (links) │
│  ├─ Conformity       │    │  (NO agents here) │    │  Sprites (agents) │
│  ├─ Fatigue/Valence  │    └──────────────────┘    └──────────────────┘
│  └─ Float32Array ──────transferables──> worldDataRef (plain ref)
└─────────────────────┘
```

**Key design decisions:**
- Agents are **never** stored in React state — only typed arrays via transferables
- Zustand holds **only** UI state: tick counter, metrics, events, params
- WorldCanvas reads `worldDataRef` directly — **zero React re-renders** during simulation
- Neuron models are **swappable interfaces** — LIF+ by default, Izhikevich on demand

---

## 📊 Financial Simulation Example

1. Select the **Financial Contagion** preset
2. Observe the 5 roles: Oil Traders, Equity Funds, Algo HFT, Central Banks, Hedge Funds
3. Click **Hormuz Blockade** to trigger the crisis scenario
4. Watch the **Sector Index** diverge as the shock propagates
5. Use the **AI Assistant** to interpret: *"What's happening to the Oil Traders?"*

---

## 🧪 Science

- Izhikevich, E.M. (2003). *Simple Model of Spiking Neurons*. IEEE Trans. Neural Networks.
- Bi, G. & Poo, M. (1998). *Synaptic Modifications in Cultured Hippocampal Neurons* (STDP).
- Oja, E. (1982). Hebbian learning and self-organization.

---

---

<div align="center">

**Built with** React + TypeScript + Vite + PixiJS + Zustand + Web Workers

*Synaptic Garden — Where agents think, connect, and evolve.*

</div>
